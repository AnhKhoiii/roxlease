package com.roxlease.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RoleRequest {
    @NotBlank(message = "Tên Role không được để trống")
    private String roleName;
    
    private String description;
    private Boolean isSystem;
    private String vpaRestriction;
}