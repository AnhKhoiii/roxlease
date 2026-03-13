package com.roxlease.system.service;

import com.roxlease.system.dto.RoleRequest;
import com.roxlease.system.model.Role;
import com.roxlease.system.repository.RoleRepository;
import com.roxlease.system.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class RoleService {

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;

    public RoleService(RoleRepository roleRepository, UserRepository userRepository) {
        this.roleRepository = roleRepository;
        this.userRepository = userRepository;
    }

    public List<Role> getAllRoles() {
        return roleRepository.findAll();
    }

    public void createRole(RoleRequest request) {
        if (roleRepository.existsById(request.getRoleName())) {
            throw new RuntimeException("This role already exists in the system.");
        }
        Role role = new Role();
        role.setRoleName(request.getRoleName().toUpperCase());
        role.setDescription(request.getDescription());
        role.setIsSystem(request.getIsSystem() != null ? request.getIsSystem() : false);
        role.setVpaRestriction(request.getVpaRestriction());
        roleRepository.save(role);
    }

    public void updateRole(String roleName, RoleRequest request) {
        Role existingRole = roleRepository.findById(roleName)
                .orElseThrow(() -> new RuntimeException("Role does not exist."));
        
        existingRole.setDescription(request.getDescription());
        existingRole.setIsSystem(request.getIsSystem() != null ? request.getIsSystem() : false);
        existingRole.setVpaRestriction(request.getVpaRestriction());
        roleRepository.save(existingRole);
    }

    public void deleteRole(String roleName) {
        if (!roleRepository.existsById(roleName)) {
            throw new RuntimeException("Role does not exist.");
        }
        if (userRepository.existsByRoleName(roleName)) {
            throw new RuntimeException("Cannot delete! Role [" + roleName + "] is currently assigned to users.");
        }
        roleRepository.deleteById(roleName);
    }

    // --- GÁN QUYỀN CHO ROLE ---
    public void assignPermissions(String roleName, List<String> permissionIds) {
        Role role = roleRepository.findById(roleName)
                .orElseThrow(() -> new RuntimeException("Role does not exist."));
        role.setPermissionsIds(permissionIds);
        roleRepository.save(role);
    }
}