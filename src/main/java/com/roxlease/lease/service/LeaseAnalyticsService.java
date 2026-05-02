package com.roxlease.lease.service;

import com.roxlease.cost.model.Enum.CostType;
import com.roxlease.cost.model.Enum.PaymentStatus;
import com.roxlease.cost.model.Enum.ScheduleStatus;
import com.roxlease.cost.model.RecurringCostSchedule;
import com.roxlease.lease.model.Lease;
import com.roxlease.lease.model.LeaseOption;
import com.roxlease.lease.model.Enum.OptionType;
import lombok.RequiredArgsConstructor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LeaseAnalyticsService {

    private final MongoTemplate mongoTemplate;

    // ============================================================================
    // 🚀 LOGIC XỬ LÝ 8 TAB REPORTS THEO TÀI LIỆU USECASE
    // ============================================================================
    public List<Map<String, Object>> getReportDataByType(String type, String siteId, LocalDate fromDate, LocalDate toDate) {
        List<Map<String, Object>> result = new ArrayList<>();
        LocalDate sysdate = LocalDate.now();

        // Lọc theo siteId nếu có
        Query leaseQuery = new Query();
        if (siteId != null && !siteId.isEmpty()) {
            leaseQuery.addCriteria(Criteria.where("siteId").is(siteId));
        }

        List<Lease> leases = mongoTemplate.find(leaseQuery, Lease.class);
        List<LeaseOption> allOptions = mongoTemplate.findAll(LeaseOption.class);
        
        Set<String> validLeaseIds = leases.stream().map(Lease::getLsId).collect(Collectors.toSet());
        Query scheduleQuery = new Query();
        if (siteId != null && !siteId.isEmpty()) {
            scheduleQuery.addCriteria(Criteria.where("leaseId").in(validLeaseIds));
        }
        List<RecurringCostSchedule> schedules = mongoTemplate.find(scheduleQuery, RecurringCostSchedule.class);
        
        if (fromDate != null || toDate != null) {
            leases = leases.stream().filter(ls -> {
                LocalDate dateToCompare = ls.getEndDate();
                if (dateToCompare == null) return true;
                return (fromDate == null || !dateToCompare.isBefore(fromDate)) && (toDate == null || !dateToCompare.isAfter(toDate));
            }).collect(Collectors.toList());
            
            schedules = schedules.stream().filter(s -> {
                LocalDate dateToCompare = s.getDueDate();
                if (dateToCompare == null) return true;
                return (fromDate == null || !dateToCompare.isBefore(fromDate)) && (toDate == null || !dateToCompare.isAfter(toDate));
            }).collect(Collectors.toList());
        }

        switch (type) {
            case "lease-exp":
                // 1. Lease by Expiration Date: Tính thời hạn thực tế của Hợp đồng
                for (Lease ls : leases) {
                    if (!Boolean.TRUE.equals(ls.getActive())) continue;
                    
                    LocalDate effectiveEnd = ls.getEndDate();
                    List<LeaseOption> ops = allOptions.stream().filter(o -> o.getLsId().equals(ls.getLsId()) && Boolean.TRUE.equals(o.getActive())).collect(Collectors.toList());
                    
                    // Ưu tiên ngày End Date của Option (Gia hạn / Chấm dứt sớm) theo logic UseCase
                    LeaseOption lastExtOrTerm = ops.stream()
                            .filter(o -> o.getOpType() == OptionType.EXTENSION || o.getOpType() == OptionType.EARLY_TERMINATION)
                            .max(Comparator.comparing(LeaseOption::getEndDate, Comparator.nullsFirst(Comparator.naturalOrder())))
                            .orElse(null);

                    if (lastExtOrTerm != null && lastExtOrTerm.getEndDate() != null) {
                        effectiveEnd = lastExtOrTerm.getEndDate();
                    }

                    if (effectiveEnd != null) {
                        long remainingDays = ChronoUnit.DAYS.between(sysdate, effectiveEnd);
                        Map<String, Object> map = new LinkedHashMap<>();
                        map.put("Lease ID", ls.getLsId());
                        map.put("Tenant", ls.getPartyId() != null ? ls.getPartyId() : "N/A");
                        map.put("Start Date", ls.getStartDate() != null ? ls.getStartDate().toString() : "-");
                        map.put("End Date", effectiveEnd.toString());
                        map.put("Remaining Days", remainingDays);
                        map.put("Status", remainingDays < 0 ? "Expired" : (remainingDays <= 90 ? "Expiring Soon" : "Active"));
                        result.add(map);
                    }
                }
                // Sắp xếp theo ngày đến hạn gần nhất
                result.sort(Comparator.comparing(m -> (Long) m.get("Remaining Days")));
                break;

            case "landlord":
            case "tenant":
                // 3 & 4. Lease by Landlord / Tenant
                boolean isLandlord = type.equals("landlord");
                Map<String, List<Lease>> groupedLeases = leases.stream()
                        .filter(l -> Boolean.TRUE.equals(l.getActive()))
                        .collect(Collectors.groupingBy(l -> {
                            String id = isLandlord ? l.getPartyId() : null;
                            return id != null ? id : "Unknown";
                        }));

                for (Map.Entry<String, List<Lease>> entry : groupedLeases.entrySet()) {
                    long count = entry.getValue().size();
                    BigDecimal totalArea = entry.getValue().stream()
                            .map(l -> l.getAreaNegotiated() != null ? BigDecimal.valueOf(l.getAreaNegotiated()) : BigDecimal.ZERO)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);

                    Map<String, Object> map = new LinkedHashMap<>();
                    map.put("Party Name", entry.getKey());
                    map.put("Lease Count", count);
                    map.put("Total Area (m2)", String.format("%,.2f", totalArea));
                    map.put("Total Revenue", "-"); // Cần map thêm Revenue nếu có
                    result.add(map);
                }
                result.sort((m1, m2) -> Long.compare((Long) m2.get("Lease Count"), (Long) m1.get("Lease Count")));
                break;

            case "inc-month":
            case "exp-month":
                // 5 & 7. Income / Expense by Month
                boolean isIncomeMonth = type.equals("inc-month");
                Map<String, List<RecurringCostSchedule>> monthlyGroup = schedules.stream()
                        .filter(s -> s.getPaymentStatus() == PaymentStatus.PAID && s.getDueDate() != null)
                        .filter(s -> isIncomeMonth ? isIncomeType(s.getCostType()) : !isIncomeType(s.getCostType()))
                        .collect(Collectors.groupingBy(s -> {
                            String monthYear = s.getDueDate().format(DateTimeFormatter.ofPattern("MM/yyyy"));
                            if (isIncomeMonth) {
                                String costTypeStr = s.getCostType() != null ? s.getCostType().name() : "OTHER";
                                return monthYear + "|" + costTypeStr;
                            }
                            return monthYear;
                        }));

                for (Map.Entry<String, List<RecurringCostSchedule>> entry : monthlyGroup.entrySet()) {
                    BigDecimal totalAmount = entry.getValue().stream()
                            .map(s -> s.getAmountInBase() != null ? s.getAmountInBase() : BigDecimal.ZERO)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);

                    Map<String, Object> map = new LinkedHashMap<>();
                    if (isIncomeMonth) {
                        String[] parts = entry.getKey().split("\\|");
                        map.put("Month/Year", parts[0]);
                        map.put("Cost Type", parts[1]);
                    } else {
                        map.put("Month/Year", entry.getKey());
                    }
                    map.put("Total Amount", String.format("%,.0f VND", totalAmount));
                    map.put("Transaction Count", entry.getValue().size());
                    map.put("Payment Status", "PAID");
                    result.add(map);
                }
                // Sort String Month/Year (giản lược)
                result.sort(Comparator.comparing(m -> (String) m.get("Month/Year")));
                break;

            case "inc-year":
            case "exp-year":
                // 6 & 8. Income / Expense by Year
                boolean isIncomeYear = type.equals("inc-year");
                Map<String, List<RecurringCostSchedule>> yearlyGroup = schedules.stream()
                        .filter(s -> s.getPaymentStatus() == PaymentStatus.PAID && s.getDueDate() != null)
                        .filter(s -> isIncomeYear ? isIncomeType(s.getCostType()) : !isIncomeType(s.getCostType()))
                        .collect(Collectors.groupingBy(s -> {
                            String year = String.valueOf(s.getDueDate().getYear());
                            if (isIncomeYear) {
                                String costTypeStr = s.getCostType() != null ? s.getCostType().name() : "OTHER";
                                return year + "|" + costTypeStr;
                            }
                            return year;
                        }));

                for (Map.Entry<String, List<RecurringCostSchedule>> entry : yearlyGroup.entrySet()) {
                    BigDecimal totalAmount = entry.getValue().stream()
                            .map(s -> s.getAmountInBase() != null ? s.getAmountInBase() : BigDecimal.ZERO)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);

                    Map<String, Object> map = new LinkedHashMap<>();
                    if (isIncomeYear) {
                        String[] parts = entry.getKey().split("\\|");
                        map.put("Year", parts[0]);
                        map.put("Cost Type", parts[1]);
                    } else {
                        map.put("Year", entry.getKey());
                    }
                    map.put("Total Amount", String.format("%,.0f VND", totalAmount));
                    map.put("Growth %", "-"); // Logic tăng trưởng năm sau so với năm trước có thể thêm sau
                    map.put("Budget vs Actual", "N/A");
                    result.add(map);
                }
                result.sort((m1, m2) -> ((String) m2.get("Year")).compareTo((String) m1.get("Year")));
                break;
        }

        return result;
    }

    // Tiện ích phân loại Doanh thu (Income) hay Chi phí (Expense)
    private boolean isIncomeType(CostType type) {
        if (type == null) return true;
        // Tùy chỉnh theo hệ thống của bạn, thường RENT và SERVICE là Income
        return type == CostType.BASERENT || type == CostType.BASESERVICE;
    }
}