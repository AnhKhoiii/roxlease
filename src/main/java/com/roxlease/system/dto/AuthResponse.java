package com.roxlease.system.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.Builder;

@Data
@Builder
@AllArgsConstructor

public class AuthResponse {
    private String token;
    private String username;
    private String rolename;
}
