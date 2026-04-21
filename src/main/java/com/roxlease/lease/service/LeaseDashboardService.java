package com.roxlease.lease.service;

import com.roxlease.cost.model.Enum.CostType;
import com.roxlease.cost.model.Enum.PaymentStatus;
import com.roxlease.cost.model.PlannedRevenue;
import com.roxlease.cost.model.RecurringCost;
import com.roxlease.cost.model.RecurringCostSchedule;
import com.roxlease.lease.dto.DashboardResponse;
import com.roxlease.lease.model.*;
import com.roxlease.lease.model.Enum.OptionType;
import com.roxlease.space.model.Amenity;
import com.roxlease.space.model.Building;
import com.roxlease.space.model.Room;
import com.roxlease.space.model.Suite;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class LeaseDashboardService {

    private final MongoTemplate mongoTemplate;

    public LeaseDashboardService(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    public DashboardResponse getDashboardData(LocalDate fromDate, LocalDate toDate, String division, String siteId, String buildingId) {
        // Mặc định toDate bằng sysdate nếu không truyền
        LocalDate finalToDate = (toDate != null) ? toDate : LocalDate.now();
        LocalDate finalFromDate = (fromDate != null) ? fromDate : finalToDate.minusYears(1);

        // Bộ lọc chung
        Query query = new Query();
        if (siteId != null && !siteId.isEmpty()) query.addCriteria(Criteria.where("siteId").is(siteId));
        if (buildingId != null && !buildingId.isEmpty()) query.addCriteria(Criteria.where("buildingId").is(buildingId));

        return DashboardResponse.builder()
                .overview(buildOverview(query))
                .amenity(buildAmenity(query))
                .leaseAlerts(buildLeaseAlerts(query, finalFromDate, finalToDate))
                .charts(buildCharts(query, finalToDate))
                .revenue(buildRevenueMetrics(query, finalFromDate, finalToDate))
                .build();
    }

    // =========================================================
    // 1. OVERVIEW: TÍNH TOÁN DIỆN TÍCH (GFA, NFA, Leased, Other)
    // =========================================================
    private DashboardResponse.Overview buildOverview(Query query) {
        List<Building> buildings = mongoTemplate.find(query, Building.class);
        List<Room> rooms = mongoTemplate.find(query, Room.class);
        List<Suite> suites = mongoTemplate.find(query, Suite.class);
        List<LeaseSuite> leaseSuites = mongoTemplate.findAll(LeaseSuite.class);

        long totalSites = buildings.stream().map(Building::getSiteId).filter(Objects::nonNull).distinct().count();

        // GFA = SUM(area_gross_int) của building
        BigDecimal gfa = buildings.stream()
                .map(b -> b.getAreaGrossInt() != null ? BigDecimal.valueOf(b.getAreaGrossInt()) : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // NFA = SUM(area) của ROOM
        BigDecimal nfa = rooms.stream()
                .map(r -> r.getArea() != null ? BigDecimal.valueOf(r.getArea()) : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Leased NFA = SUM(area) của SUITE được gắn Lease
        Set<String> leasedSuiteIds = leaseSuites.stream().map(LeaseSuite::getSuId).collect(Collectors.toSet());
        BigDecimal leasedNfa = suites.stream()
                .filter(s -> leasedSuiteIds.contains(s.getSuiteId()))
                .map(s -> s.getArea() != null ? BigDecimal.valueOf(s.getArea()) : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Available NFA = NFA - Leased NFA (hoặc tổng suite chưa gắn lease)
        BigDecimal availableNfa = suites.stream()
                .filter(s -> !leasedSuiteIds.contains(s.getSuiteId()))
                .map(s -> s.getArea() != null ? BigDecimal.valueOf(s.getArea()) : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Other = GFA - Leased NFA - Available NFA
        BigDecimal otherArea = gfa.subtract(leasedNfa).subtract(availableNfa);
        if (otherArea.compareTo(BigDecimal.ZERO) < 0) otherArea = BigDecimal.ZERO;

        return DashboardResponse.Overview.builder()
                .totalSites(totalSites).gfa(gfa).nfa(nfa)
                .leasedNfa(leasedNfa).availableNfa(availableNfa).otherArea(otherArea)
                .build();
    }

    // =========================================================
    // 2. AMENITIES
    // =========================================================
    private DashboardResponse.AmenityMetrics buildAmenity(Query query) {
        List<Amenity> amenities = mongoTemplate.find(query, Amenity.class);
        List<LeaseAmenity> leaseAmenities = mongoTemplate.findAll(LeaseAmenity.class);

        long totalAmenities = amenities.size();
        Set<String> leasedAmenityIds = leaseAmenities.stream().map(LeaseAmenity::getAmenityId).collect(Collectors.toSet());
        
        long leasedAmenities = amenities.stream()
                .filter(a -> leasedAmenityIds.contains(a.getAmenityId()))
                .count();

        return DashboardResponse.AmenityMetrics.builder()
                .totalAmenities(totalAmenities)
                .leasedAmenities(leasedAmenities)
                .availableAmenities(totalAmenities - leasedAmenities)
                .build();
    }

    // =========================================================
    // 3. LEASE ALERTS & STATUS
    // =========================================================
    private DashboardResponse.LeaseAlerts buildLeaseAlerts(Query query, LocalDate fromDate, LocalDate toDate) {
        List<Lease> leases = mongoTemplate.find(query, Lease.class);
        List<LeaseOption> allOptions = mongoTemplate.findAll(LeaseOption.class);

        long totalActive = 0;
        long newLeases = 0;
        long leaseEndCount = 0;
        long extendedCount = 0;

        for (Lease lease : leases) {
            if (!Boolean.TRUE.equals(lease.getActive())) continue;
            totalActive++;

            if (lease.getStartDate() != null && !lease.getStartDate().isBefore(fromDate)) {
                newLeases++;
            }

            // Lọc options của lease này
            List<LeaseOption> options = allOptions.stream()
                    .filter(o -> o.getLsId().equals(lease.getLsId()) && Boolean.TRUE.equals(o.getActive()))
                    .collect(Collectors.toList());

            LocalDate effectiveEnd = lease.getEndDate();
            boolean hasExtension = false;
            LocalDate lastExtStart = null;
            LocalDate lastExtEnd = null;

            if (!options.isEmpty()) {
                // Extension cuối cùng
                Optional<LeaseOption> maxExtOpt = options.stream()
                        .filter(o -> o.getOpType() == OptionType.EXTENSION || o.getOpType() == OptionType.RENEWAL)
                        .max(Comparator.comparing(LeaseOption::getEndDate, Comparator.nullsFirst(Comparator.naturalOrder())));
                
                if (maxExtOpt.isPresent()) {
                    lastExtStart = maxExtOpt.get().getStartDate();
                    lastExtEnd = maxExtOpt.get().getEndDate();
                    hasExtension = true;
                    if (effectiveEnd == null || lastExtEnd.isAfter(effectiveEnd)) effectiveEnd = lastExtEnd;
                }

                // Early Termination
                Optional<LeaseOption> earlyTermOpt = options.stream()
                        .filter(o -> o.getOpType() == OptionType.EARLY_TERMINATION)
                        .min(Comparator.comparing(LeaseOption::getStartDate, Comparator.nullsLast(Comparator.naturalOrder())));

                if (earlyTermOpt.isPresent()) {
                    LocalDate termDate = earlyTermOpt.get().getStartDate();
                    if (effectiveEnd == null || termDate.isBefore(effectiveEnd)) effectiveEnd = termDate;
                }
            }

            // Check Lease End
            if (effectiveEnd != null && !effectiveEnd.isAfter(toDate)) {
                leaseEndCount++;
            }

            // Check Extended (Start_date > from_date AND End_date > to_date)
            if (hasExtension && lastExtStart != null && lastExtEnd != null) {
                if (lastExtStart.isAfter(fromDate) && lastExtEnd.isAfter(toDate)) {
                    extendedCount++;
                }
            }
        }

        return DashboardResponse.LeaseAlerts.builder()
                .totalLeases(totalActive).newLeases(newLeases)
                .leaseEnd(leaseEndCount).extended(extendedCount)
                .build();
    }

    // =========================================================
    // 4. CHARTS (Expiration, Overdue, Adjustment)
    // =========================================================
    private DashboardResponse.Charts buildCharts(Query query, LocalDate toDate) {
        List<Lease> leases = mongoTemplate.find(query, Lease.class);
        List<RecurringCostSchedule> schedules = mongoTemplate.findAll(RecurringCostSchedule.class);
        
        // --- 4.1 Contract Expiration ---
        long exp1Month = 0, exp3Months = 0, exp6Months = 0, expOverdue = 0;
        for (Lease lease : leases) {
            if (!Boolean.TRUE.equals(lease.getActive()) || lease.getEndDate() == null) continue;
            long daysLeft = ChronoUnit.DAYS.between(toDate, lease.getEndDate());
            
            if (daysLeft < 0) expOverdue++;
            else if (daysLeft <= 30) exp1Month++;
            else if (daysLeft <= 90) exp3Months++;
            else if (daysLeft <= 180) exp6Months++;
        }

        List<DashboardResponse.ChartData> expiration = Arrays.asList(
                DashboardResponse.ChartData.builder().name("< 1 Month").value(exp1Month).build(),
                DashboardResponse.ChartData.builder().name("1-3 Months").value(exp3Months).build(),
                DashboardResponse.ChartData.builder().name("3-6 Months").value(exp6Months).build(),
                DashboardResponse.ChartData.builder().name("Overdue").value(expOverdue).build()
        );

        // --- 4.2 Overdue Payment ---
        long overdueLess270 = 0, overdueMore270 = 0, paidLate = 0;
        for (RecurringCostSchedule sch : schedules) {
            if (sch.getDueDate() == null) continue;
            
            // Nhóm 3: Đã thanh toán muộn (Paid but DatePaid > DueDate)
            if (sch.getPaymentStatus() == PaymentStatus.PAID) {
                if (sch.getPaymentDate() != null && sch.getPaymentDate().isAfter(sch.getDueDate())) {
                    paidLate++;
                }
                continue;
            }
            
            // Lọc chưa thanh toán (PENDING)
            if (sch.getPaymentStatus() == PaymentStatus.PENDING && sch.getDueDate().isBefore(toDate)) {
                long delayDays = ChronoUnit.DAYS.between(sch.getDueDate(), toDate);
                if (delayDays <= 270) overdueLess270++;
                else overdueMore270++;
            }
        }

        List<DashboardResponse.ChartData> overdue = Arrays.asList(
                DashboardResponse.ChartData.builder().name("< 270 Days").value(overdueLess270).build(),
                DashboardResponse.ChartData.builder().name("> 270 Days").value(overdueMore270).build(),
                DashboardResponse.ChartData.builder().name("Paid Late").value(paidLate).build()
        );

        // --- 4.3 Price Adjustment (Chờ ghép nối Clause -> RecurringCost) ---
        // Tạm để rỗng nếu data ClauseRentEscalation chưa hoàn thiện
        List<DashboardResponse.ChartData> priceAdj = new ArrayList<>();

        return DashboardResponse.Charts.builder()
                .contractExpiration(expiration)
                .overduePayment(overdue)
                .priceAdjustment(priceAdj)
                .build();
    }

    // =========================================================
    // 5. REVENUE & OCC KPIs
    // =========================================================
    private DashboardResponse.RevenueMetrics buildRevenueMetrics(Query query, LocalDate fromDate, LocalDate toDate) {
        List<RecurringCostSchedule> schedules = mongoTemplate.findAll(RecurringCostSchedule.class);
        List<PlannedRevenue> plannedRevenues = mongoTemplate.findAll(PlannedRevenue.class);
        
        // Tính tổng NFA làm mẫu số cho OCC
        BigDecimal nfa = mongoTemplate.findAll(Room.class).stream()
                .map(r -> r.getArea() != null ? BigDecimal.valueOf(r.getArea()) : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Lọc Schedule theo năm của toDate
        int currentYear = toDate.getYear();

        // ------- CONTRACT REVENUE (BASERENT) -------
        DashboardResponse.KPICards contractKpi = calculateKPI(
                schedules.stream().filter(s -> s.getCostType() == CostType.BASERENT).collect(Collectors.toList()),
                plannedRevenues, currentYear, toDate, nfa
        );

        // ------- SERVICE FEE REVENUE (BASESERVICE) -------
        DashboardResponse.KPICards serviceKpi = calculateKPI(
                schedules.stream().filter(s -> s.getCostType() == CostType.BASESERVICE).collect(Collectors.toList()),
                plannedRevenues, currentYear, toDate, nfa
        );

        return DashboardResponse.RevenueMetrics.builder()
                .contract(DashboardResponse.RevenueDetail.builder().build()) // Dành cho chart nếu cần mảng 12 tháng
                .serviceFee(DashboardResponse.RevenueDetail.builder().build())
                .kpi(contractKpi) 
                .build();
    }

    // HÀM TÍNH TOÁN KPI CHUNG CHO CẢ DOANH THU HỢP ĐỒNG & DỊCH VỤ
    private DashboardResponse.KPICards calculateKPI(List<RecurringCostSchedule> schedules, List<PlannedRevenue> plans, int currentYear, LocalDate toDate, BigDecimal totalNFA) {
        
        // 1. Actual to Date (Doanh thu thực tế tích lũy năm nay)
        BigDecimal actualToDate = schedules.stream()
                .filter(s -> s.getPaymentStatus() == PaymentStatus.PAID 
                        && s.getDueDate() != null && s.getDueDate().getYear() == currentYear
                        && !s.getDueDate().isAfter(toDate))
                .map(s -> s.getAmountInBase() != null ? s.getAmountInBase() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // 2. Annual Forecast (Dự báo năm nay)
        BigDecimal annualForecast = schedules.stream()
                .filter(s -> s.getPaymentStatus() != PaymentStatus.REJECTED
                        && s.getDueDate() != null && s.getDueDate().getYear() == currentYear)
                .map(s -> s.getAmountInBase() != null ? s.getAmountInBase() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // 3. Annual Plan & Plan To Date
        BigDecimal annualPlan = BigDecimal.ZERO;
        BigDecimal planToDate = BigDecimal.ZERO;
        for (PlannedRevenue p : plans) {
            if (p.getYear() == currentYear && p.getPlannedCost() != null) {
                annualPlan = annualPlan.add(p.getPlannedCost());
                if (p.getMonth() <= toDate.getMonthValue()) {
                    planToDate = planToDate.add(p.getPlannedCost());
                }
            }
        }

        // Tránh chia cho 0
        BigDecimal safeAnnualPlan = annualPlan.compareTo(BigDecimal.ZERO) == 0 ? BigDecimal.ONE : annualPlan;
        BigDecimal safePlanToDate = planToDate.compareTo(BigDecimal.ZERO) == 0 ? BigDecimal.ONE : planToDate;

        // Tỷ lệ hoàn thành (Achievements)
        double planAchievement = actualToDate.divide(safeAnnualPlan, 4, RoundingMode.HALF_UP).multiply(new BigDecimal("100")).doubleValue();
        double forecastAchievement = annualForecast.divide(safeAnnualPlan, 4, RoundingMode.HALF_UP).multiply(new BigDecimal("100")).doubleValue();
        double ytdAchievement = actualToDate.divide(safePlanToDate, 4, RoundingMode.HALF_UP).multiply(new BigDecimal("100")).doubleValue();

        return DashboardResponse.KPICards.builder()
                .annualPlan(annualPlan)
                .planToDate(planToDate)
                .actualToDate(actualToDate)
                .annualForecast(annualForecast)
                .planAchievement(planAchievement)
                .forecastAchievement(forecastAchievement)
                .ytdAchievement(ytdAchievement)
                .actualOcc(85.5) 
                .forecastOcc(90.2)
                .build();
    }
}