package com.roxlease.cost.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "planned_revenues")
public class PlannedRevenue {
    @Id
    private String id;
    
    private String siteId;
    private String category;
    private Integer year;
    private Integer month;
    
    private Double plannedRevenue;
    private Double plannedOcc;
    private Double plannedCost;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}