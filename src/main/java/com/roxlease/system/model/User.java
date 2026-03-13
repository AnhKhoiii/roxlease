package com.roxlease.system.model;

import com.roxlease.system.model.Enum.*;
import com.roxlease.system.model.Enum.Gender;
import com.roxlease.system.model.Enum.UserStatus;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;
import java.time.LocalDate;
import java.util.List;

@Data
@AllArgsConstructor

@Document(collection = "users")
public class User {
    @Id
    private String username;

    @Field("role_name")
    private String roleName;

    @Field("user_pwd")
    private String userPwd;

    private String fullname;
    
    private LocalDate birthday;
    private Gender gender;
    private String company;
    private String employeeTitle;
    private String department;
    private String manager;
    private String email;
    private String phone;


    private UserStatus status;

    @Field("failed_attempts")
    private Integer failedAttempts;

    @Field("last_login_at")
    private LocalDateTime lastLoginAt;

    private List<String> vpasite;

    @Field("created_at")
    private LocalDateTime createdAt;

    @Field("updated_at")
    private LocalDateTime updatedAt;

    @Field("deleted_at")
    private LocalDateTime deletedAt;

    public User() {
        this.createdAt = LocalDateTime.now();
        this.status = UserStatus.ACTIVE;
        this.failedAttempts = 0;
    }

    public void incrementFailedAttempts() {
        if (this.failedAttempts == null) {
            this.failedAttempts = 1;
        } else {
            this.failedAttempts++;
        }
    }

    public void resetFailedAttempts() {
        this.failedAttempts = 0;
    }

    public void lockAccount() {
        this.status = UserStatus.LOCKED;
    }

    public void unlockAccount() {
        this.status = UserStatus.ACTIVE;
    }

    public boolean isLocked() {
        return this.status == UserStatus.LOCKED;
    }

    public boolean isActive() {
        return this.status == UserStatus.ACTIVE;
    }

    public boolean isInactive() {
        return this.status == UserStatus.INACTIVE;
    }

    public void activateAccount() {
        this.status = UserStatus.ACTIVE;
    }

    public void deactivateAccount() {
        this.status = UserStatus.INACTIVE;
    }

    private static final int MAX_FAILED_ATTEMPTS = 5;
    public void handleFailedLoginAttempt() {
        incrementFailedAttempts();
        if (this.failedAttempts >= MAX_FAILED_ATTEMPTS) {
            lockAccount();
        }
    }

    
}
