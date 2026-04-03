package com.roxlease.lease.model;

import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "amendments")
public class Amendment {

    @Id
    private String amendmentId;

    @Indexed
    @Field("ls_id")
    private String lsId;

    @Field("requested_date")
    private LocalDate requestedDate;

    @Field("effective_date")
    private LocalDate effectiveDate;

    @Field("exercised_by")
    private String exercisedBy;

    @Field("doc")
    private String docUrl;

    private String description;

    private Boolean active;

    @CreatedDate
    @Field("created_at")
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Field("updated_at")
    private LocalDateTime updatedAt;
}