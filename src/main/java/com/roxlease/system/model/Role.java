package com.roxlease.system.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@AllArgsConstructor

@Document(collection = "roles")
public class Role {
    @Id
    private String roleName;

    private String description;

    @Field("is_system")
    private Boolean isSystem;

    @Field("VPA_restriction")
    private String vpaRestriction;

    @Field("permissions_ids")
    private List<String> permissionsIds;

    @Field("created_at")
    private LocalDateTime createdAt;

    public Role() {
        this.createdAt = LocalDateTime.now();
    }

}
