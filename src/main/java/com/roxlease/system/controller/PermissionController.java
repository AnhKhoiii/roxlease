package com.roxlease.system.controller;

import com.roxlease.system.dto.PermissionRequest;
import com.roxlease.system.model.Permissions;
import com.roxlease.system.service.PermissionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;

@RestController
@RequestMapping("/api/permissions")
public class PermissionController {

    private final PermissionService permissionService;

    public PermissionController(PermissionService permissionService) {
        this.permissionService = permissionService;
    }

    @GetMapping
    public ResponseEntity<List<Permissions>> getAllPermissions() {
        return ResponseEntity.ok(permissionService.getAllPermissions());
    }

    @PostMapping
    public ResponseEntity<?> createPermission(@Valid @RequestBody PermissionRequest request) {
        try {
            permissionService.createPermission(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(Collections.singletonMap("message", "Create Permission successfully."));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Collections.singletonMap("error", e.getMessage()));
        }
    }

    @PutMapping("/{permissionId}")
    public ResponseEntity<?> updatePermission(@PathVariable String permissionId, @RequestBody PermissionRequest request) {
        try {
            permissionService.updatePermission(permissionId, request);
            return ResponseEntity.ok(Collections.singletonMap("message", "Update Permission successfully."));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Collections.singletonMap("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{permissionId}")
    public ResponseEntity<?> deletePermission(@PathVariable String permissionId) {
        try {
            permissionService.deletePermission(permissionId);
            return ResponseEntity.ok(Collections.singletonMap("message", "Delete Permission successfully."));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Collections.singletonMap("error", e.getMessage()));
        }
    }
}