package com.roxlease.cost.model;

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
@Document(collection = "recurring_cost_schedules")
public class RecurringCostSchedule {

    @Id
    private String scheduleId;

    @Indexed // Index để tìm nhanh các lịch thanh toán thuộc về 1 gói chi phí
    @Field("recurring_cost_id")
    private String recurringCostId;

    @Field("due_date")
    private LocalDate dueDate;

    @Field("period_start")
    private LocalDate periodStart;

    @Field("period_end")
    private LocalDate periodEnd;

    private BigDecimal amount;

    private String status; 

    @CreatedDate
    @Field("created_at")
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Field("updated_at")
    private LocalDateTime updatedAt;
}