package com.roxlease.cost.controller;

import com.roxlease.cost.model.RecurringCost;
import com.roxlease.cost.repository.RecurringCostRepository;
import com.roxlease.cost.service.CostWizardService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.Map;

@RestController
@RequestMapping("/api/cost/wizard")
public class CostWizardController {

    @Autowired
    private CostWizardService service;
    @Autowired
    private RecurringCostRepository recurringCostRepo;

    // TAB 1
    @GetMapping("/recurring-costs")
    public ResponseEntity<?> getBaseCosts() {
        return ResponseEntity.ok(recurringCostRepo.findAll());
    }

    @PostMapping("/generate-schedule/{id}")
    public ResponseEntity<?> generateSchedule(@PathVariable String id) {
        try {
            return ResponseEntity.ok(service.generateSchedule(id));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("error", e.getMessage()));
        }
    }

    // TAB 2
    @GetMapping("/approvals")
    public ResponseEntity<?> getApprovals() {
        return ResponseEntity.ok(service.getPendingApprovals());
    }

    @PostMapping("/approve/{id}")
    public ResponseEntity<?> approveCost(@PathVariable String id) {
        return ResponseEntity.ok(service.approveCost(id));
    }

    @PostMapping("/reject/{id}")
    public ResponseEntity<?> rejectCost(@PathVariable String id, @RequestBody Map<String, String> payload) {
        try {
            return ResponseEntity.ok(service.rejectCost(id, payload.get("reason")));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("error", e.getMessage()));
        }
    }

    // TAB 3
    @GetMapping("/reviews")
    public ResponseEntity<?> getReviews() {
        return ResponseEntity.ok(service.getReviewCosts());
    }

    @PostMapping("/pay/{id}")
    public ResponseEntity<?> markPaid(@PathVariable String id) {
        try {
            return ResponseEntity.ok(service.markAsPaid(id));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("error", e.getMessage()));
        }
    }
}