
package com.roxlease.model;

import org.springframework.context.annotation.ComponentScan.Filter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor

@Document(collection = "activity_logs")
public class ActivityLogs {
    @Id
    private String activityLogId;

    @Field("user_name")
    private String username;

    private String action;
    private String entity;

    @Field("entity_id")
    private String entityId;

    @Field("old_value")
    private String oldValue;

    @Field("new_value")
    private String newValue;

    @Field("ip_address")
    private String ipAddress;

    @Field("user_agent")
    private String userAgent;

    @Field("created_at")
    private LocalDateTime createdAt;

    public ActivityLogs() {
        this.createdAt = LocalDateTime.now();
    }
    
}
