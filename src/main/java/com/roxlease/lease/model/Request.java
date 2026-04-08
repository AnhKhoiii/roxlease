package com.roxlease.lease.model;

import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import com.roxlease.lease.model.Enum.RQStatus;
import com.roxlease.lease.model.Enum.RQType;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "requests")
public class Request {

    @Id
    private String id;
    
    private String requestId;
    private RQType requestType;
    private String siteId;
    private String createdBy;
    
    @CreatedDate
    private LocalDateTime createdDate;
    
    private RQStatus status;
    
    private String completedBy;
    private LocalDateTime completedDate;
    private String comment;
    private String document;

    private String targetId;
    private String action;   
    private java.util.Map<String, Object> requestData;
}