// File: src/main/java/com/roxlease/lease/model/Clause.java
package com.roxlease.lease.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "clauses")
public class Clause {

    @Id
    private String id;
    
    @NotBlank(message = "Clause ID is required")
    private String clauseId;
    
    private String leaseId;
    
    private LocalDate startDate;
    private LocalDate endDate;
    private String responsibleParty;
    private String exercisedBy;
    private String description;
    private String documentUrl;
    
    @NotNull
    private Boolean isActive;
    
    private String status;
    
    @CreatedDate
    private LocalDateTime createdAt;
    
    @LastModifiedDate
    private LocalDateTime updatedAt;
}