package com.roxlease.space.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.roxlease.space.model.Room;
import com.roxlease.space.model.Suite;
import com.roxlease.space.repository.RoomRepository;
import com.roxlease.space.repository.SuiteRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

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

    @Autowired
    private RoomRepository roomRepository;
    
    @Autowired
    private SuiteRepository suiteRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    public void processAndSaveFloorPlan(String floorId, MultipartFile file) throws Exception {
        // 1. Lưu file tạm thời
        Path tempDir = Files.createTempDirectory("dxf_uploads");
        File tempFile = new File(tempDir.toFile(), file.getOriginalFilename());
        file.transferTo(tempFile);

        // 2. Gọi Python script
        String pythonCmd = System.getProperty("os.name").toLowerCase().contains("win") ? "python" : "python3";
        // Đảm bảo đường dẫn này trỏ đúng đến file script ở bước 2
        String scriptPath = new File("scripts/dxf_parser.py").getAbsolutePath(); 

        ProcessBuilder pb = new ProcessBuilder(pythonCmd, scriptPath, tempFile.getAbsolutePath());
        pb.redirectErrorStream(true);
        Process process = pb.start();

        // 3. Đọc kết quả JSON từ Python
        StringBuilder output = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
            String line;
            while ((line = reader.readLine()) != null) {
                output.append(line);
            }
        }
        
        int exitCode = process.waitFor();
        tempFile.delete(); // Xóa file tạm

        if (exitCode != 0 || output.toString().contains("\"error\"")) {
            throw new RuntimeException("Lỗi xử lý DXF: " + output);
        }

        // 4. Parse JSON và lưu vào Database
        JsonNode rootNode = objectMapper.readTree(output.toString());
        
        // --- Xử lý ROOMS ---
        List<Room> roomsToSave = new ArrayList<>();
        if (rootNode.has("rooms")) {
            for (JsonNode roomNode : rootNode.get("rooms")) {
                Room room = new Room();
                room.setFlId(floorId);
                room.setRoomCode(roomNode.get("layer").asText() + "-" + UUID.randomUUID().toString().substring(0, 4));
                
                Map<String, Object> geomMap = objectMapper.convertValue(roomNode.get("geometry"), Map.class);
                room.setGeometry(geomMap);
                roomsToSave.add(room);
            }
            roomRepository.saveAll(roomsToSave);
        }

        // --- Xử lý SUITES ---
        List<Suite> suitesToSave = new ArrayList<>();
        if (rootNode.has("suites")) {
            for (JsonNode suiteNode : rootNode.get("suites")) {
                Suite suite = new Suite();
                suite.setFlId(floorId);
                
                Map<String, Object> geomMap = objectMapper.convertValue(suiteNode.get("geometry"), Map.class);
                suite.setGeometry(geomMap);
                suitesToSave.add(suite);
            }
            suiteRepository.saveAll(suitesToSave);
        }
    }
}