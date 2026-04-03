package com.roxlease.lease.model;

import com.roxlease.lease.model.Enum.ExercisedBy;
import com.roxlease.lease.model.Enum.OptionType;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "lease_options")
public class LeaseOption {

    @Id
    private String opId; // Chuyển Integer sang String để tận dụng ObjectId

    @Indexed
    @Field("ls_id")
    private String lsId;

    @Field("op_description")
    private String opDescription;

    @Field("op_type")
    private OptionType opType;

    @Field("issue_date")
    private LocalDate issueDate;

    @Field("date_match_ls")
    private Boolean dateMatchLs;

    @Field("start_date")
    private LocalDate startDate;

    @Field("end_date")
    private LocalDate endDate;

    @Field("exercised_by")
    private ExercisedBy exercisedBy;

    @Field("area_involved")
    private Double areaInvolved; // Diện tích dùng Double

    @Field("cost_est")
    private BigDecimal costEst; // Tiền tệ dùng BigDecimal

    @Field("doc")
    private String docUrl; // Lưu URL thay vì BinData

    private Boolean active;

    @CreatedDate
    @Field("created_at")
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Field("updated_at")
    private LocalDateTime updatedAt;
}