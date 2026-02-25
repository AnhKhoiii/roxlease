package com.roxlease.model;

import com.roxlease.model.Enum.UserStatus;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

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

    private String email;
    private String fullname;

    private UserStatus status;

    @Field("failed_attempts")
    private Integer failedAttempts;

    @Field("last_login_at")
    private LocalDateTime lastLoginAt;

    @Field("created_at")
    private LocalDateTime createdAt;

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
        resetFailedAttempts();
    }

    public boolean isAccountLocked() {
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
