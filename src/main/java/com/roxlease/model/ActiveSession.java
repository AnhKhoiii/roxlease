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
    private String token;

    private String username;
    
    private String ipAddress; 
    private String device;

    @Indexed(expireAfterSeconds = 0) 
    private Date expiresAt;
}
