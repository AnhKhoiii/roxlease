package com.roxlease.service;

import com.roxlease.dto.RoleRequest;
import com.roxlease.model.Role;
import com.roxlease.repository.RoleRepository;
import com.roxlease.repository.UserRepository;
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
            throw new RuntimeException("Role này đã tồn tại trong hệ thống.");
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
                .orElseThrow(() -> new RuntimeException("Role không tồn tại."));
        
        existingRole.setDescription(request.getDescription());
        existingRole.setIsSystem(request.getIsSystem() != null ? request.getIsSystem() : false);
        existingRole.setVpaRestriction(request.getVpaRestriction());
        roleRepository.save(existingRole);
    }

    public void deleteRole(String roleName) {
        if (!roleRepository.existsById(roleName)) {
            throw new RuntimeException("Role không tồn tại.");
        }
        if (userRepository.existsByRoleName(roleName)) {
            throw new RuntimeException("Không thể xóa! Role [" + roleName + "] đang được gán cho người dùng.");
        }
        roleRepository.deleteById(roleName);
    }
}