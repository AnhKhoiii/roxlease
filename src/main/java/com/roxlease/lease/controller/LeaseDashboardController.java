package com.roxlease.lease.controller;

import com.roxlease.lease.service.LeaseDashboardService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/lease/dashboard")
public class LeaseDashboardController {

    private final LeaseDashboardService service;

    public LeaseDashboardController(LeaseDashboardService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<?> getDashboard(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(required = false) String division,
            @RequestParam(required = false) String siteId,
            @RequestParam(required = false) String buildingId) {
        
        try {
            return ResponseEntity.ok(service.getDashboardData(fromDate, toDate, division, siteId, buildingId));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}