package com.roxlease.lease.controller;

import com.roxlease.lease.model.Request;
import com.roxlease.lease.model.Enum.RQStatus;
import com.roxlease.lease.model.Enum.RQType;
import com.roxlease.lease.service.RequestService;
import com.roxlease.lease.repository.RequestRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.FileWriter;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/lease/requests")
public class RequestController {

    private final RequestService service;
    private final RequestRepository requestRepository; 

    public RequestController(RequestService service, RequestRepository requestRepository) {
        this.service = service;
        this.requestRepository = requestRepository;
    }

    @GetMapping("/pending")
    public ResponseEntity<Page<Request>> getPending(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdDate"));
        return ResponseEntity.ok(service.getPendingRequests(pageable));
    }

    @GetMapping("/history")
    public ResponseEntity<Page<Request>> getHistory(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "completedDate"));
        return ResponseEntity.ok(service.getRequestHistory(pageable));
    }

    @PostMapping
    public ResponseEntity<Request> createRequest(@RequestBody Request request) {
        return ResponseEntity.ok(service.createRequest(request));
    }

    @PutMapping("/{id}/approve")
    public ResponseEntity<Request> approveRequest(@PathVariable String id, @RequestParam(defaultValue = "Admin") String user) {
        return ResponseEntity.ok(service.approveRequest(id, user));
    }

    @PutMapping("/{id}/reject")
    public ResponseEntity<Request> rejectRequest(
            @PathVariable String id, 
            @RequestParam(defaultValue = "Admin") String user,
            @RequestBody Map<String, String> payload) {
        String comment = payload.getOrDefault("comment", "");
        return ResponseEntity.ok(service.rejectRequest(id, user, comment));
    }

    @PostMapping("/submit-module")
    public ResponseEntity<?> submitModuleRequest(@RequestBody Map<String, Object> payload) {
        try {
            String siteId = (String) payload.getOrDefault("siteId", "N/A");
            String action = (String) payload.get("action"); 
            String requestTypeStr = (String) payload.get("requestType"); 
            String targetId = (String) payload.get("targetId");
            Map<String, Object> data = (Map<String, Object>) payload.get("data");

            // 1. SINH FILE EXCEL CHỈ CHỨA TRƯỜNG BỊ THAY ĐỔI
            String reqId = "REQ-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
            String fileName = requestTypeStr + "_" + reqId + ".csv";
            
            Path uploadDir = Paths.get("uploads").toAbsolutePath().normalize();
            if (!Files.exists(uploadDir)) Files.createDirectories(uploadDir);
            Path filePath = uploadDir.resolve(fileName);
            
            try (FileWriter writer = new FileWriter(filePath.toFile(), StandardCharsets.UTF_8)) {
                writer.write('\ufeff'); // BOM cho Excel
                writer.append("Field Name,New Value\n");
                if (data != null) {
                    for (Map.Entry<String, Object> entry : data.entrySet()) {
                        String value = entry.getValue() != null ? entry.getValue().toString().replace(",", ";") : "null";
                        writer.append(entry.getKey()).append(",").append(value).append("\n");
                    }
                }
            }

            // 2. LƯU REQUEST VÀO CSDL KÈM DATA ĐỂ DUYỆT TỰ ĐỘNG
            Request newReq = Request.builder()
                    .requestId(reqId)
                    .requestType(RQType.valueOf(requestTypeStr))
                    .siteId(siteId)
                    .createdBy("Current_User")
                    .createdDate(LocalDateTime.now())
                    .status(RQStatus.PENDING)
                    .document("/api/files/download/" + fileName)
                    .comment("System generated request for " + action + " action. Target ID: " + targetId)
                    .targetId(targetId)
                    .action(action)
                    .requestData(data)
                    .build();

            requestRepository.save(newReq);

            return ResponseEntity.ok(java.util.Collections.singletonMap("message", "Request submitted successfully!"));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(java.util.Collections.singletonMap("error", "Lỗi tạo Request: " + e.getMessage()));
        }
    }

    // ====================================================
    // API KIỂM TRA XUNG ĐỘT SUITE (WARNING FRONTEND)
    // ====================================================
    @GetMapping("/check-suite/{suId}")
    public ResponseEntity<?> checkSuitePending(@PathVariable String suId) {
        try {
            boolean hasPending = service.checkIfSuiteHasPendingRequest(suId);
            return ResponseEntity.ok(java.util.Collections.singletonMap("hasPending", hasPending));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(java.util.Collections.singletonMap("error", e.getMessage()));
        }
    }
}