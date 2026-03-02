package com.roxlease.dto;

import java.util.List;

import com.roxlease.model.Enum.UserStatus;
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