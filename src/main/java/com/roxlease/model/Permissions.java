package com.roxlease.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor

@Document(collection = "permissions")
public class Permissions {
    @Id
    private String permissionId;

    private String code;
    private String module;
    private String action;
    private String description;

}
