package com.roxlease.lease.controller;

import com.roxlease.lease.model.Request;
import com.roxlease.lease.service.RequestService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/lease/requests")
public class RequestController {

    private final RequestService service;

    public RequestController(RequestService service) {
        this.service = service;
    }

    @GetMapping("/pending")
    public ResponseEntity<Page<Request>> getPending(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdDate"));
        return ResponseEntity.ok(service.getPendingRequests(pageable));
    }

    @GetMapping("/history")
    public ResponseEntity<Page<Request>> getHistory(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "completedDate"));
        return ResponseEntity.ok(service.getRequestHistory(pageable));
    }

    @PostMapping
    public ResponseEntity<Request> createRequest(@RequestBody Request request) {
        return ResponseEntity.ok(service.createRequest(request));
    }

    @PutMapping("/{id}/approve")
    public ResponseEntity<Request> approveRequest(@PathVariable String id, @RequestParam(defaultValue = "Admin") String user) {
        return ResponseEntity.ok(service.approveRequest(id, user));
    }

    @PutMapping("/{id}/reject")
    public ResponseEntity<Request> rejectRequest(
            @PathVariable String id, 
            @RequestParam(defaultValue = "Admin") String user,
            @RequestBody Map<String, String> payload) {
        String comment = payload.getOrDefault("comment", "");
        return ResponseEntity.ok(service.rejectRequest(id, user, comment));
    }
}