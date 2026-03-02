package com.roxlease.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class UpdateUserRequest {
    
    @NotBlank(message = "Email không được để trống")
    @Email(message = "Email không đúng định dạng")
    private String email;
    
    @NotBlank(message = "Họ tên không được để trống")
    private String fullname;
    
    @NotBlank(message = "Role không được để trống")
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