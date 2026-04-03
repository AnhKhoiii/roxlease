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
@Document(collection = "ls_suites")
public class LeaseSuite {

    @Id
    private String lsSuId; // Chuyển Integer thành String

    @Indexed
    @Field("ls_id")
    private String lsId;

    @Indexed
    @Field("su_id")
    private String suId;

    @Field("date_start")
    private LocalDate dateStart;

    @Field("date_end")
    private LocalDate dateEnd;

    @CreatedDate
    @Field("created_at")
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Field("updated_at")
    private LocalDateTime updatedAt;
}