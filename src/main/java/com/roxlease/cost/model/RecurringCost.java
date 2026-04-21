package com.roxlease.cost.model;

import com.roxlease.cost.model.Enum.Period;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import org.springframework.data.mongodb.core.mapping.FieldType; 

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "recurring_costs")
public class RecurringCost {

    @Id
    private String recurringCostId; 

    @Indexed 
    @Field("ls_id")
    private String lsId;

    @Field("cost_type")
    private String costType;

    @Field("vat_country")
    private String vatCountry;

    // 🚀 FIX LỖI BIGDECIMAL MONGODB CHO TẤT CẢ CÁC TRƯỜNG
    @Field(value = "curr_vat", targetType = FieldType.DECIMAL128)
    private BigDecimal currVat;

    @Field(value = "amount_in_base", targetType = FieldType.DECIMAL128)
    private BigDecimal amountInBase;

    @Field(value = "amount_in_vat", targetType = FieldType.DECIMAL128)
    private BigDecimal amountInVat; 

    @Field(value = "amount_in_total", targetType = FieldType.DECIMAL128)
    private BigDecimal amountInTotal;

    @Field("override_exchange_rate")
    private Boolean overrideExchangeRate;

    @Field(value = "exchange_rate", targetType = FieldType.DECIMAL128)
    private BigDecimal exchangeRate;

    @Field(value = "amount_out_base", targetType = FieldType.DECIMAL128)
    private BigDecimal amountOutBase;

    @Field(value = "amount_out_vat", targetType = FieldType.DECIMAL128)
    private BigDecimal amountOutVat; 

    @Field(value = "amount_out_total", targetType = FieldType.DECIMAL128)
    private BigDecimal amountOutTotal; 

    @Field("override_vat")
    private Boolean overrideVat; 

    @Field(value = "manual_base", targetType = FieldType.DECIMAL128)
    private BigDecimal manualBase; 

    // 🚀 BỔ SUNG TRƯỜNG NÀY ĐỂ CHẠY USE CASE 01
    @Field("schedule_status")
    private String scheduleStatus = "NONE"; 

    // --- CẤU HÌNH THỜI GIAN ---
    @Field("date_match_ls")
    private Boolean dateMatchLs;

    private Period period;

    private Integer interval;

    @Field("start_date")
    private LocalDate startDate;

    @Field("end_date")
    private LocalDate endDate;

    private Boolean active;

    private String description;

    @CreatedDate
    @Field("created_at")
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Field("updated_at")
    private LocalDateTime updatedAt;
}