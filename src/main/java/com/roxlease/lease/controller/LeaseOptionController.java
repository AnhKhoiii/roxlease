package com.roxlease.lease.controller;

import com.roxlease.lease.model.LeaseOption;
import com.roxlease.lease.service.LeaseOptionService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;

@RestController
@RequestMapping("/api/lease/leases/{leaseId}/options")
public class LeaseOptionController {

    private final LeaseOptionService service;

    public LeaseOptionController(LeaseOptionService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<Page<LeaseOption>> getOptions(
            @PathVariable String leaseId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(service.getOptionsByLease(leaseId, pageable));
    }

    @PostMapping
    public ResponseEntity<LeaseOption> createOption(@PathVariable String leaseId, @RequestBody LeaseOption option) {
        return ResponseEntity.ok(service.createOption(leaseId, option));
    }

    @PutMapping("/{id}")
    public ResponseEntity<LeaseOption> updateOption(@PathVariable String leaseId, @PathVariable String id, @RequestBody LeaseOption option) {
        return ResponseEntity.ok(service.updateOption(id, option));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteOption(@PathVariable String leaseId, @PathVariable String id) {
        try {
            service.deleteOption(id);
            return ResponseEntity.ok(Collections.singletonMap("message", "Option deleted successfully"));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("error", e.getMessage()));
        }
    }
}