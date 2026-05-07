package com.roxlease.lease.service;

import com.roxlease.cost.model.Enum.CostType;
import com.roxlease.cost.model.Enum.PaymentStatus;
import com.roxlease.cost.model.Enum.ScheduleStatus;
import com.roxlease.cost.model.RecurringCostSchedule;
import com.roxlease.cost.model.RecurringCost;
import com.roxlease.lease.model.Lease;
import com.roxlease.lease.model.LeaseOption;
import com.roxlease.lease.model.Enum.OptionType;
import lombok.RequiredArgsConstructor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
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
    // LẤY DỮ LIỆU KPI CHO DASHBOARD (SERVICE & AMENITY)
    // Áp dụng đúng công thức KH yêu cầu
    // ============================================================================
    public Map<String, Map<String, Object>> getDashboardKPIs(LocalDate toDate) {
        if (toDate == null) toDate = LocalDate.now();
        int targetYear = toDate.getYear();
        int targetMonth = toDate.getMonthValue();

        // 1. TẬP HỢP CATEGORY THEO YÊU CẦU
        List<String> amenityCategories = Arrays.asList("OCC", "Billboard", "Pool", "Parking Area", "Event Hall", "Other");
        String serviceCategory = "Service";

        // Truy vấn dữ liệu Kế hoạch (Plan)
        // Sử dụng org.bson.Document để mapping linh hoạt vì data từ collection plans (hoặc planned_revenues)
        Query planQuery = new Query();
        List<org.bson.Document> allPlans = mongoTemplate.find(planQuery, org.bson.Document.class, "planned_revenues");

        // Lấy toàn bộ CPĐK và Lịch biểu để check theo đúng công thức
        List<RecurringCost> allCosts = mongoTemplate.findAll(RecurringCost.class);
        List<RecurringCostSchedule> allSchedules = mongoTemplate.findAll(RecurringCostSchedule.class);
        
        // Map category & trạng thái của từng RecurringCost cho các Schedule
        Map<String, String> costCategoryMap = new HashMap<>();
        Set<String> scheduledCostIds = new HashSet<>();
        for (RecurringCost c : allCosts) {
            if (c.getCostType() != null) {
                costCategoryMap.put(c.getRecurringCostId(), c.getCostType());
            }
            if ("SCHEDULED".equals(c.getScheduleStatus())) {
                scheduledCostIds.add(c.getRecurringCostId());
            }
        }

        // --- CÁC BIẾN TÍNH TOÁN CHO SERVICE ---
        BigDecimal svcAnnualPlan = BigDecimal.ZERO;
        BigDecimal svcPlanToDate = BigDecimal.ZERO;
        BigDecimal svcActualToDate = BigDecimal.ZERO;
        BigDecimal svcAnnualForecast = BigDecimal.ZERO;

        // --- CÁC BIẾN TÍNH TOÁN CHO AMENITY ---
        BigDecimal amActualRev = BigDecimal.ZERO;     // Doanh thu thực hiện tiện ích theo tháng
        BigDecimal amForecastRev = BigDecimal.ZERO;   // Doanh thu dự báo tiện ích theo tháng
        BigDecimal amAnnualPlan = BigDecimal.ZERO;
        BigDecimal amPlanToDate = BigDecimal.ZERO;
        BigDecimal amActualToDate = BigDecimal.ZERO;
        BigDecimal amAnnualForecast = BigDecimal.ZERO;

        // 2. TÍNH CHỈ SỐ PLAN (KẾ HOẠCH DOANH THU)
        for (org.bson.Document plan : allPlans) {
            String cat = plan.getString("category");
            if (cat == null) continue;

            java.util.Date rawDate = plan.getDate("end_date");
            if (rawDate == null) continue;
            
            LocalDate endDate = rawDate.toInstant().atZone(java.time.ZoneId.systemDefault()).toLocalDate();
            Object planCostObj = plan.get("plan_cost");
            BigDecimal planCost = planCostObj != null ? new BigDecimal(planCostObj.toString()) : BigDecimal.ZERO;

            if (endDate.getYear() == targetYear) {
                // Dành cho Service
                if (serviceCategory.equalsIgnoreCase(cat) || "Income_Base service".equalsIgnoreCase(cat)) {
                    svcAnnualPlan = svcAnnualPlan.add(planCost);
                    if (endDate.getMonthValue() <= targetMonth) {
                        svcPlanToDate = svcPlanToDate.add(planCost); // KH Lũy kế đến thời điểm báo cáo
                    }
                }
                // Dành cho Amenity (Trừ Rental & Service)
                else if (amenityCategories.contains(cat)) {
                    amAnnualPlan = amAnnualPlan.add(planCost);
                    if (endDate.getMonthValue() <= targetMonth) {
                        amPlanToDate = amPlanToDate.add(planCost);
                    }
                }
            }
        }

        // 3. TÍNH CHỈ SỐ ACTUAL & FORECAST (THỰC TẾ & DỰ BÁO)
        for (RecurringCostSchedule sch : allSchedules) {
            String cat = costCategoryMap.get(sch.getRecurringCostId());
            if (cat == null) continue;

            LocalDate due = sch.getDueDate();
            if (due == null || due.getYear() != targetYear) continue;

            BigDecimal amt = sch.getAmountInBase() != null ? sch.getAmountInBase() : BigDecimal.ZERO;
            boolean isPaid = sch.getPaymentStatus() == PaymentStatus.PAID;
            boolean isNotCancelled = sch.getPaymentStatus() != PaymentStatus.REJECTED; // Tương đương != CANCELLED
            boolean isScheduledPlan = scheduledCostIds.contains(sch.getRecurringCostId()); // CPĐK có Schedule_Status = Schedule

            // --- LOGIC CHO SERVICE ---
            if (serviceCategory.equalsIgnoreCase(cat) || "Income_Base service".equalsIgnoreCase(cat) || "BASESERVICE".equalsIgnoreCase(cat)) {
                if (isPaid && !due.isAfter(toDate)) {
                    svcActualToDate = svcActualToDate.add(amt);
                }
                if (isScheduledPlan) {
                    svcAnnualForecast = svcAnnualForecast.add(amt);
                }
            }
            
            // --- LOGIC CHO AMENITY ---
            else if (amenityCategories.contains(cat)) {
                // Các chỉ số tính theo đúng Tháng (Monthly)
                if (due.getMonthValue() == targetMonth) {
                    if (isPaid) amActualRev = amActualRev.add(amt);
                    if (isNotCancelled) amForecastRev = amForecastRev.add(amt); // Dự báo tiện ích theo tháng
                }

                // Lũy kế đến thời điểm báo cáo & Dự báo năm
                if (isPaid && !due.isAfter(toDate)) {
                    amActualToDate = amActualToDate.add(amt);
                }
                if (isScheduledPlan) {
                    amAnnualForecast = amAnnualForecast.add(amt);
                }
            }
        }

        // 4. TÍNH TỈ LỆ HOÀN THÀNH (ACHIEVEMENTS) & TRẢ VỀ DỮ LIỆU
        Map<String, Object> serviceKPI = new LinkedHashMap<>();
        serviceKPI.put("Annual Plan", svcAnnualPlan);
        serviceKPI.put("Plan to Date", svcPlanToDate);
        serviceKPI.put("Actual to Date", svcActualToDate);
        serviceKPI.put("Annual Forecast", svcAnnualForecast);
        serviceKPI.put("Plan Achievement (%)", calcPercentage(svcActualToDate, svcAnnualPlan));
        serviceKPI.put("Forecast Achievement (%)", calcPercentage(svcAnnualForecast, svcAnnualPlan));
        serviceKPI.put("YTD Achievement (%)", calcPercentage(svcActualToDate, svcPlanToDate));

        Map<String, Object> amenityKPI = new LinkedHashMap<>();
        amenityKPI.put("Actual Revenue", amActualRev);
        amenityKPI.put("Forecast Revenue", amForecastRev);
        amenityKPI.put("Annual Plan", amAnnualPlan);
        amenityKPI.put("Plan to Date", amPlanToDate);
        amenityKPI.put("Actual to Date", amActualToDate);
        amenityKPI.put("Annual Forecast", amAnnualForecast);
        amenityKPI.put("Plan Achievement (%)", calcPercentage(amActualToDate, amAnnualPlan));
        amenityKPI.put("Forecast Achievement (%)", calcPercentage(amAnnualForecast, amAnnualPlan));
        amenityKPI.put("YTD Achievement (%)", calcPercentage(amActualToDate, amPlanToDate));

        Map<String, Map<String, Object>> dashboardData = new HashMap<>();
        dashboardData.put("Service", serviceKPI);
        dashboardData.put("Amenity", amenityKPI);

        return dashboardData;
    }

    private double calcPercentage(BigDecimal part, BigDecimal total) {
        if (total == null || total.compareTo(BigDecimal.ZERO) == 0) return 0.0;
        return part.divide(total, 4, RoundingMode.HALF_UP).multiply(new BigDecimal("100")).doubleValue();
    }

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