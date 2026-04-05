package com.roxlease.lease.controller;

import com.roxlease.lease.model.Clause;
import com.roxlease.lease.service.ClauseService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;

@RestController
@RequestMapping("/api/lease/leases/{leaseId}/clauses")
public class ClauseController {

    private final ClauseService service;

    public ClauseController(ClauseService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<Page<Clause>> getClauses(
            @PathVariable String leaseId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(service.getClausesByLease(leaseId, pageable));
    }

    @PostMapping
    public ResponseEntity<Clause> createClause(
            @PathVariable String leaseId,
            @Valid @RequestBody Clause clause) {
        return ResponseEntity.ok(service.createClause(leaseId, clause));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Clause> updateClause(
            @PathVariable String leaseId,
            @PathVariable String id,
            @Valid @RequestBody Clause clause) {
        return ResponseEntity.ok(service.updateClause(id, clause));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteClause(
            @PathVariable String leaseId,
            @PathVariable String id) {
        try {
            service.deleteClause(id);
            return ResponseEntity.ok(Collections.singletonMap("message", "Clause deleted successfully"));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}/submit")
    public ResponseEntity<Clause> submitRequest(
            @PathVariable String leaseId,
            @PathVariable String id) {
        return ResponseEntity.ok(service.submitRequest(id));
    }
}