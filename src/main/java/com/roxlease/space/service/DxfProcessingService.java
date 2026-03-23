package com.roxlease.space.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.roxlease.space.model.Floor; // Thêm Model Floor
import com.roxlease.space.model.Room;
import com.roxlease.space.model.Suite;
import com.roxlease.space.repository.FloorRepository; // Thêm Repository Floor
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

    // ================= ĐÂY LÀ PHẦN BẠN BỊ THIẾU =================
    @Autowired
    private FloorRepository floorRepository;
    // ============================================================

    @Autowired
    private RoomRepository roomRepository;
    
    @Autowired
    private SuiteRepository suiteRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Transactional // Đảm bảo việc xóa và lưu phải thành công cùng nhau
    public void processAndSaveFloorPlan(String floorId, MultipartFile file) throws Exception {
        // 1. Lưu file tạm thời
        Path tempDir = Files.createTempDirectory("dxf_uploads");
        File tempFile = new File(tempDir.toFile(), file.getOriginalFilename());
        file.transferTo(tempFile);

        // 2. Gọi Python script
        String pythonCmd = System.getProperty("os.name").toLowerCase().contains("win") ? "python" : "python3";
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
        tempFile.delete(); 
        
        if (exitCode != 0 || output.toString().contains("\"error\"")) {
            throw new RuntimeException("Lỗi xử lý DXF: " + output);
        }

        // Xóa sạch dữ liệu Room và Suite cũ của Tầng này trước khi import cái mới
        roomRepository.deleteByFlId(floorId);
        suiteRepository.deleteByFlId(floorId);

        JsonNode rootNode = objectMapper.readTree(output.toString());

        // ================= LƯU TRỰC TIẾP JSON VÀO FLOOR =================
        Floor floor = floorRepository.findById(floorId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy Tầng với ID: " + floorId));
        
        Map<String, Object> drawingMap = objectMapper.convertValue(rootNode, Map.class);
        floor.setDrawingJson(drawingMap);
        
        floorRepository.save(floor);
        // ======================================================================
        
        // --- Xử lý ROOMS ---
        List<Room> roomsToSave = new ArrayList<>();
        if (rootNode.has("rooms")) {
            for (JsonNode roomNode : rootNode.get("rooms")) {
                Room room = new Room();
                room.setFlId(floorId);
                room.setRoomCode(roomNode.get("layer").asText() + "-" + UUID.randomUUID().toString().substring(0, 4));
                
                // LƯU DIỆN TÍCH
                if(roomNode.has("area")) room.setArea(roomNode.get("area").asDouble());
                
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
                suite.setSuiteCode(suiteNode.get("layer").asText() + "-" + UUID.randomUUID().toString().substring(0, 4));

                if(suiteNode.has("area")) suite.setArea(suiteNode.get("area").asDouble());

                Map<String, Object> geomMap = objectMapper.convertValue(suiteNode.get("geometry"), Map.class);
                suite.setGeometry(geomMap);
                suitesToSave.add(suite);
            }
            suiteRepository.saveAll(suitesToSave);
        }
    }
}