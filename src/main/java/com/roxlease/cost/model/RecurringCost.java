package com.roxlease.cost.model;

import com.roxlease.cost.model.Enum.Period;
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
@Document(collection = "recurring_costs")
public class RecurringCost {

    @Id
    private String recurringCostId; // Đổi integer thành String để dùng ObjectId của MongoDB

    @Indexed // Index để map với Hợp đồng (Lease) cực kỳ quan trọng
    @Field("ls_id")
    private String lsId;

    @Field("cost_type")
    private String costType;

    @Field("vat_country")
    private String vatCountry;

    @Field("curr_vat")
    private BigDecimal currVat;

    @Field("amount_in_base")
    private BigDecimal amountInBase;

    @Field("amount_in_vat")
    private BigDecimal amountInVat; 

    @Field("amount_in_total")
    private BigDecimal amountInTotal;

    // --- TỶ GIÁ ---
    @Field("override_exchange_rate")
    private Boolean overrideExchangeRate;

    @Field("exchange_rate")
    private BigDecimal exchangeRate;

    // --- TIỀN CHI (OUT) - Đã fix các lỗi sai kiểu dữ liệu ---
    @Field("amount_out_base")
    private BigDecimal amountOutBase;

    @Field("amount_out_vat")
    private BigDecimal amountOutVat; // Fix từ 'date' sang 'BigDecimal'

    @Field("amount_out_total")
    private BigDecimal amountOutTotal; // Fix từ 'varchar' sang 'BigDecimal'

    @Field("override_vat")
    private Boolean overrideVat; // Bổ sung theo Rule

    @Field("manual_base")
    private BigDecimal manualBase; // Dùng để lưu tạm tiền Base tự nhập nếu CostType = "Other"

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