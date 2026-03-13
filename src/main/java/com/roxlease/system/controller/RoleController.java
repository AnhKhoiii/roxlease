package com.roxlease.system.controller;

import com.roxlease.system.dto.RoleRequest;
import com.roxlease.system.model.Role;
import com.roxlease.system.service.RoleService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;

@RestController
@RequestMapping("/api/roles")
public class RoleController {

    private final RoleService roleService;

    public RoleController(RoleService roleService) {
        this.roleService = roleService;
    }

    @GetMapping
    public ResponseEntity<List<Role>> getAllRoles() {
        return ResponseEntity.ok(roleService.getAllRoles());
    }

    @PostMapping
    public ResponseEntity<?> createRole(@Valid @RequestBody RoleRequest request) {
        try {
            roleService.createRole(request);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(Collections.singletonMap("message", "Create Role successfully."));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Collections.singletonMap("error", e.getMessage()));
        }
    }

    @PutMapping("/{roleName}")
    public ResponseEntity<?> updateRole(@PathVariable String roleName, @RequestBody RoleRequest request) {
        try {
            roleService.updateRole(roleName, request);
            return ResponseEntity.ok(Collections.singletonMap("message", "Update Role successfully."));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Collections.singletonMap("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{roleName}")
    public ResponseEntity<?> deleteRole(@PathVariable String roleName) {
        try {
            roleService.deleteRole(roleName);
            return ResponseEntity.ok(Collections.singletonMap("message", "Delete Role successfully."));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Collections.singletonMap("error", e.getMessage()));
        }
    }

    @PutMapping("/{roleName}/permissions")
    public ResponseEntity<?> assignPermissions(@PathVariable String roleName, @RequestBody List<String> permissionIds) {
        try {
            roleService.assignPermissions(roleName, permissionIds);
            return ResponseEntity.ok(Collections.singletonMap("message", "Assign permissions successfully."));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Collections.singletonMap("error", e.getMessage()));
        }
    }
}