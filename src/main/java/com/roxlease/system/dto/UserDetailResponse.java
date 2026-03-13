package com.roxlease.dto;

import com.roxlease.model.Enum.*;
import lombok.Data;
import java.time.LocalDate;
import java.util.List;

@Data
public class UserDetailResponse {
    private String username;
    private String fullname;
    private String company;
    private String roleName;
    private String email;
    private String department;
    private String userPwd;
    private String phone;
    private String employeeTitle;
    private int failedAttempts;
    private LocalDate birthday;
    private String manager;
    private UserStatus status;
    private Gender gender;
    private List<String> vpasite;
}
