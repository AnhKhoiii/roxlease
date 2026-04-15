package com.roxlease.cost.model;

import com.roxlease.cost.model.Enum.PaymentStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "recurring_cost_schedule")
public class RecurringCostSchedule {
    @Id
    private String id;
    private String recurringCostId;
    private String leaseId;
    private String costType;
    private String vatCountry;
    private String currency;
    
    private BigDecimal amountInBase;
    private BigDecimal amountInVat;
    private BigDecimal amountInTotal;
    private BigDecimal amountOutBase;
    private BigDecimal amountOutVat;
    private BigDecimal amountOutTotal;
    
    private LocalDate periodSrc;
    private LocalDate periodEnd;
    private LocalDate dueDate;
    
    private LocalDateTime approvalDate;
    private String cancelReason;
    private LocalDateTime datePaid;
    
    private PaymentStatus paymentStatus;
    private String description;
}