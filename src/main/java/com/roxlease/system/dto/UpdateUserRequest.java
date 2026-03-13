package com.roxlease.system.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class UpdateUserRequest {
    
    @Email(message = "Email không đúng định dạng")
    private String email;
    
    private String fullname;
    
    private String roleName;

    private String password; 

    private String company;
    private String department;
    private String phone;
    private String employeeTitle;
    private LocalDate birthday;
    private String manager;
    private String gender;
    
    private List<String> vpasite;
}