package com.roxlease.cost.controller;

import com.roxlease.cost.model.RecurringCost;
import com.roxlease.cost.service.RecurringCostService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/lease/leases/{leaseId}/recurring-costs")
public class RecurringCostController {

    @Autowired
    private RecurringCostService service;

    @GetMapping
    public ResponseEntity<?> getCosts(@PathVariable String leaseId) {
        return ResponseEntity.ok(service.getByLeaseId(leaseId));
    }

    @PostMapping
    public ResponseEntity<?> createCost(@PathVariable String leaseId, @RequestBody RecurringCost cost) {
        return ResponseEntity.ok(service.saveOrUpdate(leaseId, cost));
    }

    @PutMapping("/{costId}")
    public ResponseEntity<?> updateCost(@PathVariable String leaseId, @PathVariable String costId, @RequestBody RecurringCost cost) {
        cost.setRecurringCostId(costId);
        return ResponseEntity.ok(service.saveOrUpdate(leaseId, cost));
    }

    @DeleteMapping("/{costId}")
    public ResponseEntity<?> deleteCost(@PathVariable String leaseId, @PathVariable String costId) {
        service.delete(costId);
        return ResponseEntity.ok().build();
    }
}