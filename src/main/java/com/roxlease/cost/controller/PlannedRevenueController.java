package com.roxlease.cost.controller;

import com.roxlease.cost.model.PlannedRevenue;
import com.roxlease.cost.service.PlannedRevenueService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;

@RestController
@RequestMapping("/api/cost/planned-revenues")
public class PlannedRevenueController {

    @Autowired
    private PlannedRevenueService service;

    @GetMapping
    public ResponseEntity<?> getAll(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        try {
            Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "year", "month"));
            return ResponseEntity.ok(service.getFilteredData(year, month, pageable));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Collections.singletonMap("error", e.getMessage()));
        }
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody PlannedRevenue data) {
        try {
            return ResponseEntity.ok(service.save(data));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable String id, @RequestBody PlannedRevenue data) {
        try {
            data.setId(id);
            return ResponseEntity.ok(service.save(data));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable String id) {
        try {
            service.delete(id);
            return ResponseEntity.ok(Collections.singletonMap("message", "Deleted successfully"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Collections.singletonMap("error", "Delete failed"));
        }
    }
}