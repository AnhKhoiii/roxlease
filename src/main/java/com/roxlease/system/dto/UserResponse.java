package com.roxlease.system.dto;

import com.roxlease.system.model.Enum.UserStatus;
import lombok.Data;

@Data
public class UserResponse {
    private String username;
    private String fullname;
    private String company;
    private String department;
    private String roleName;
    private String email;
    private UserStatus status;
}