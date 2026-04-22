package com.roxlease.lease.controller;

import com.roxlease.lease.service.LeaseAnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/lease/analytics")
@RequiredArgsConstructor
public class LeaseAnalyticsController {

    private final LeaseAnalyticsService analyticsService;

    @GetMapping("/reports")
    public ResponseEntity<List<Map<String, Object>>> getReports(
            @RequestParam String type,
            @RequestParam(required = false) String siteId) {
        return ResponseEntity.ok(analyticsService.getReportDataByType(type, siteId));
    }
}