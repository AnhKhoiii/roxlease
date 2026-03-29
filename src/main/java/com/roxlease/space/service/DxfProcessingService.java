package com.roxlease.space.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.roxlease.space.model.Floor;
import com.roxlease.space.model.Room;
import com.roxlease.space.model.Suite;
import com.roxlease.space.repository.FloorRepository;
import com.roxlease.space.repository.RoomRepository;
import com.roxlease.space.repository.SuiteRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.transaction.annotation.Transactional;

import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class DxfProcessingService {

    @Autowired private FloorRepository floorRepository;
    @Autowired private RoomRepository roomRepository;
    @Autowired private SuiteRepository suiteRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Transactional 
    public void processAndSaveFloorPlan(String floorId, MultipartFile file) throws Exception {
        Path tempDir = Files.createTempDirectory("dxf_uploads");
        File tempFile = new File(tempDir.toFile(), file.getOriginalFilename());
        file.transferTo(tempFile);

        String pythonCmd = System.getProperty("os.name").toLowerCase().contains("win") ? "python" : "python3";
        String scriptPath = new File("scripts/dxf_parser.py").getAbsolutePath(); 

        ProcessBuilder pb = new ProcessBuilder(pythonCmd, scriptPath, tempFile.getAbsolutePath());
        pb.redirectErrorStream(true);
        Process process = pb.start();

        StringBuilder output = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
            String line;
            while ((line = reader.readLine()) != null) {
                output.append(line);
            }
        }
        
        int exitCode = process.waitFor();
        tempFile.delete(); 
        
        if (exitCode != 0 || output.toString().contains("\"error\"")) {
            throw new RuntimeException("Lỗi xử lý DXF: " + output);
        }

        JsonNode rootNode = objectMapper.readTree(output.toString());

        Floor floor = floorRepository.findById(floorId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy Tầng với ID: " + floorId));
        
        Map<String, Object> drawingMap = objectMapper.convertValue(rootNode, Map.class);
        floor.setDrawingJson(drawingMap);
        floorRepository.save(floor);

        // ================= SMART UPSERT LOGIC =================
        List<Room> existingRooms = roomRepository.findByFlId(floorId);
        List<Suite> existingSuites = suiteRepository.findByFlId(floorId);

        List<Room> roomsToSave = new ArrayList<>();
        if (rootNode.has("rooms")) {
            for (JsonNode roomNode : rootNode.get("rooms")) {
                String cadId = roomNode.get("cad_id").asText();
                String extractedCode = roomNode.has("extracted_code") && !roomNode.get("extracted_code").isNull() 
                                       ? roomNode.get("extracted_code").asText() 
                                       : roomNode.get("layer").asText() + "-" + cadId.substring(Math.max(0, cadId.length() - 4));

                String compositeRoomId = floorId + "_" + extractedCode; 
                Double newArea = roomNode.has("area") ? roomNode.get("area").asDouble() : 0.0;
                Map<String, Object> newGeom = objectMapper.convertValue(roomNode.get("geometry"), Map.class);

                Room matchedRoom = existingRooms.stream()
                        .filter(r -> r.getRoomId() != null && r.getRoomId().equals(compositeRoomId))
                        .findFirst()
                        .orElse(null);

                if (matchedRoom != null) {
                    boolean isChanged = Math.abs(matchedRoom.getArea() - newArea) > 0.01 || !matchedRoom.getGeometry().equals(newGeom);
                    if (isChanged) {
                        matchedRoom.setVersion(matchedRoom.getVersion() != null ? matchedRoom.getVersion() + 1 : 2);
                        matchedRoom.setArea(newArea);
                        matchedRoom.setGeometry(newGeom);
                    }
                    matchedRoom.setRoomCode(extractedCode); 
                    roomsToSave.add(matchedRoom);
                    existingRooms.remove(matchedRoom); 
                } else {
                    Room newRoom = new Room();
                    newRoom.setRoomId(compositeRoomId); 
                    newRoom.setFlId(floorId);
                    newRoom.setCadObjectId(cadId);
                    newRoom.setRoomCode(extractedCode);
                    newRoom.setRoomName("Room " + extractedCode); 
                    newRoom.setArea(newArea);
                    newRoom.setGeometry(newGeom);
                    newRoom.setVersion(1);
                    roomsToSave.add(newRoom);
                }
            }
            roomRepository.deleteAll(existingRooms);
            roomRepository.saveAll(roomsToSave);
        }

        List<Suite> suitesToSave = new ArrayList<>();
        if (rootNode.has("suites")) {
            for (JsonNode suiteNode : rootNode.get("suites")) {
                String cadId = suiteNode.get("cad_id").asText();
                String extractedCode = suiteNode.has("extracted_code") && !suiteNode.get("extracted_code").isNull() 
                                       ? suiteNode.get("extracted_code").asText() 
                                       : suiteNode.get("layer").asText() + "-" + cadId.substring(Math.max(0, cadId.length() - 4));
                
                String compositeSuiteId = floorId + "_" + extractedCode;
                Double newArea = suiteNode.has("area") ? suiteNode.get("area").asDouble() : 0.0;
                Map<String, Object> newGeom = objectMapper.convertValue(suiteNode.get("geometry"), Map.class);

                Suite matchedSuite = existingSuites.stream()
                        .filter(s -> s.getSuiteId() != null && s.getSuiteId().equals(compositeSuiteId))
                        .findFirst()
                        .orElse(null);

                if (matchedSuite != null) {
                    boolean isChanged = Math.abs(matchedSuite.getArea() - newArea) > 0.01 || !matchedSuite.getGeometry().equals(newGeom);
                    if (isChanged) {
                        matchedSuite.setVersion(matchedSuite.getVersion() != null ? matchedSuite.getVersion() + 1 : 2);
                        matchedSuite.setArea(newArea);
                        matchedSuite.setGeometry(newGeom);
                    }
                    matchedSuite.setSuiteCode(extractedCode);
                    suitesToSave.add(matchedSuite);
                    existingSuites.remove(matchedSuite);
                } else {
                    Suite newSuite = new Suite();
                    newSuite.setSuiteId(compositeSuiteId); 
                    newSuite.setFlId(floorId);
                    newSuite.setCadObjectId(cadId);
                    newSuite.setSuiteCode(extractedCode);
                    newSuite.setArea(newArea);
                    newSuite.setGeometry(newGeom);
                    newSuite.setVersion(1);
                    suitesToSave.add(newSuite);
                }
            }
            suiteRepository.deleteAll(existingSuites);
            suiteRepository.saveAll(suitesToSave);
        }
    }
}