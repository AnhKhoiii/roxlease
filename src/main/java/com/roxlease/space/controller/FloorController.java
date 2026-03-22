package com.roxlease.space.controller;

import com.roxlease.space.service.DxfProcessingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/floors")
public class FloorController {

    @Autowired
    private DxfProcessingService dxfProcessingService;

    @PostMapping("/{floorId}/upload-dxf")
    public ResponseEntity<?> uploadFloorPlan(@PathVariable String floorId, @RequestParam("file") MultipartFile file) {
        try {
            if (!file.getOriginalFilename().toLowerCase().endsWith(".dxf")) {
                return ResponseEntity.badRequest().body("Chỉ chấp nhận file định dạng .dxf");
            }
            dxfProcessingService.processAndSaveFloorPlan(floorId, file);
            return ResponseEntity.ok().body("Upload và bóc tách dữ liệu thành công!");
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Lỗi: " + e.getMessage());
        }
    }
}