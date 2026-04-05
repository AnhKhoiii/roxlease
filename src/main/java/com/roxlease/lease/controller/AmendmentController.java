package com.roxlease.lease.controller;

import com.roxlease.lease.model.Amendment;
import com.roxlease.lease.service.AmendmentService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;

@RestController
@RequestMapping("/api/lease/leases/{leaseId}/amendments")
public class AmendmentController {

    private final AmendmentService service;

    public AmendmentController(AmendmentService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<Page<Amendment>> getAmendments(
            @PathVariable String leaseId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(service.getAmendmentsByLease(leaseId, pageable));
    }

    @PostMapping
    public ResponseEntity<Amendment> createAmendment(@PathVariable String leaseId, @RequestBody Amendment amendment) {
        return ResponseEntity.ok(service.createAmendment(leaseId, amendment));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Amendment> updateAmendment(@PathVariable String leaseId, @PathVariable String id, @RequestBody Amendment amendment) {
        return ResponseEntity.ok(service.updateAmendment(id, amendment));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteAmendment(@PathVariable String leaseId, @PathVariable String id) {
        try {
            service.deleteAmendment(id);
            return ResponseEntity.ok(Collections.singletonMap("message", "Amendment deleted successfully"));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("error", e.getMessage()));
        }
    }
}