package com.roxlease.lease.controller;

import com.roxlease.lease.model.LeaseSuite;
import com.roxlease.lease.service.LeaseSuiteService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;

@RestController
@RequestMapping("/api/lease/leases/{leaseId}/suites")
public class LeaseSuiteController {

    private final LeaseSuiteService service;

    public LeaseSuiteController(LeaseSuiteService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<Page<LeaseSuite>> getSuites(
            @PathVariable String leaseId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(service.getSuitesByLease(leaseId, pageable));
    }

    @PostMapping
    public ResponseEntity<LeaseSuite> createSuite(@PathVariable String leaseId, @RequestBody LeaseSuite suite) {
        return ResponseEntity.ok(service.createLeaseSuite(leaseId, suite));
    }

    @PutMapping("/{id}")
    public ResponseEntity<LeaseSuite> updateSuite(@PathVariable String leaseId, @PathVariable String id, @RequestBody LeaseSuite suite) {
        return ResponseEntity.ok(service.updateLeaseSuite(id, suite));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteSuite(@PathVariable String leaseId, @PathVariable String id) {
        service.deleteLeaseSuite(id);
        return ResponseEntity.ok(Collections.singletonMap("message", "Lease Suite deleted successfully"));
    }
}