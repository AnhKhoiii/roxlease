package com.roxlease.space.controller;

import com.roxlease.space.service.BuildingPerformanceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;

@RestController
@RequestMapping("/api/space/performance")
public class BuildingPerformanceController {

    @Autowired
    private BuildingPerformanceService service;

    @GetMapping
    public ResponseEntity<?> getPerformance(
            @RequestParam(required = false, defaultValue = "ALL") String siteId,
            @RequestParam(required = false, defaultValue = "ALL") String blId) {  // <-- Đổi thành blId
        try {
            return ResponseEntity.ok(service.getPerformanceMetrics(siteId, blId));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Collections.singletonMap("error", e.getMessage()));
        }
    }
}