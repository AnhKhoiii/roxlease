package com.roxlease.cost.controller;

import com.roxlease.cost.model.RecurringCost;
import com.roxlease.cost.service.RecurringCostService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;

@RestController
@RequestMapping("/api/lease/leases/{leaseId}/recurring-costs")
public class RecurringCostController {

    @Autowired
    private RecurringCostService service;

    @GetMapping
    public ResponseEntity<?> getCosts(@PathVariable String leaseId) {
        try {
            return ResponseEntity.ok(service.getByLeaseId(leaseId));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Collections.singletonMap("error", e.getMessage()));
        }
    }

    @PostMapping
    public ResponseEntity<?> createCost(@PathVariable String leaseId, @RequestBody RecurringCost cost) {
        try {
            return ResponseEntity.ok(service.saveOrUpdate(leaseId, cost));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Collections.singletonMap("error", e.getMessage()));
        }
    }

    @PutMapping("/{costId}")
    public ResponseEntity<?> updateCost(@PathVariable String leaseId, @PathVariable String costId, @RequestBody RecurringCost cost) {
        try {
            cost.setRecurringCostId(costId);
            return ResponseEntity.ok(service.saveOrUpdate(leaseId, cost));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Collections.singletonMap("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{costId}")
    public ResponseEntity<?> deleteCost(@PathVariable String leaseId, @PathVariable String costId) {
        try {
            service.delete(costId);
            return ResponseEntity.ok(Collections.singletonMap("message", "Đã xóa Recurring Cost thành công!"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Collections.singletonMap("error", "Lỗi khi xóa: " + e.getMessage()));
        }
    }
}