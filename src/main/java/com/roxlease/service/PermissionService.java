package com.roxlease.service;

import com.roxlease.dto.PermissionRequest;
import com.roxlease.model.Permissions;
import com.roxlease.repository.PermissionRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class PermissionService {

    private final PermissionRepository permissionRepository;

    public PermissionService(PermissionRepository permissionRepository) {
        this.permissionRepository = permissionRepository;
    }

    public List<Permissions> getAllPermissions() {
        return permissionRepository.findAll();
    }

    public void createPermission(PermissionRequest request) {
        // Tự động generate code: VD: SYSTEM_USER_VIEW
        String code = String.format("%s_%s_%s", 
                request.getModule().toUpperCase(), 
                request.getApplication().toUpperCase().replaceAll("\\s+", "_"), 
                request.getAction().toUpperCase());

        if (permissionRepository.existsById(code)) {
            throw new RuntimeException("Permission has already existed!");
        }

        Permissions perm = new Permissions(code, code, 
                request.getModule().toUpperCase(), 
                request.getApplication().toUpperCase().replaceAll("\\s+", "_"), 
                request.getAction().toUpperCase(), 
                request.getDescription());

        permissionRepository.save(perm);
    }

    public void updatePermission(String permissionId, PermissionRequest request) {
        Permissions perm = permissionRepository.findById(permissionId)
                .orElseThrow(() -> new RuntimeException("Permission not found!"));

        perm.setDescription(request.getDescription());
        permissionRepository.save(perm);
    }

    public void deletePermission(String permissionId) {
        if (!permissionRepository.existsById(permissionId)) {
            throw new RuntimeException("Permission not found!");
        }
        permissionRepository.deleteById(permissionId);
    }
}