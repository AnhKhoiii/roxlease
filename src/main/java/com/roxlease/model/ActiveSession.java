package com.roxlease.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.Data;

import java.util.Date;

@Data
@Document(collection = "active_sessions")
public class ActiveSession {
    @Id
    private String id;

    @Indexed(unique = true)
    private String token; // Chuỗi UUID

    private String username;
    
    // Lưu thông tin theo Use Case 1.1: Ghi lại địa chỉ IP và thiết bị đăng nhập
    private String ipAddress; 
    private String device;

    // TTL Index: MongoDB sẽ tự động xóa document này khi thời gian hiện tại vượt quá expiresAt
    @Indexed(expireAfterSeconds = 0) 
    private Date expiresAt;

    // TODO: Tạo Constructors, Getters và Setters
}
