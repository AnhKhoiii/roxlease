package com.roxlease.system.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import com.roxlease.system.model.Enum.LoginStatus;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.Builder;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@Builder

@Document(collection = "login_history")
public class LoginHistory {

    @Id
    private String loginHistoryId;

    @Field("user_name")
    private String username;

    @Field("ip_address")
    private String ipAddress;

    @Field("user_agent")
    private String userAgent;

    private LoginStatus status;

    @Field("created_at")
    private LocalDateTime createdAt;

    public LoginHistory() {
        this.createdAt = LocalDateTime.now();
    }

}

