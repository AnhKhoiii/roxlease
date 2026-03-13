package com.roxlease.system.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class PermissionRequest {
    @NotBlank(message = "Module can not be blank")
    private String module;

    @NotBlank(message = "Application can not be blank")
    private String application;

    @NotBlank(message = "Action can not be blank")
    private String action;

    private String description;
}