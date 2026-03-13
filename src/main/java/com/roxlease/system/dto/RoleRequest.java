package com.roxlease.system.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RoleRequest {
    @NotBlank(message = "Role name is required")
    private String roleName;
    
    private String description;
    private Boolean isSystem;
    private String vpaRestriction;
}