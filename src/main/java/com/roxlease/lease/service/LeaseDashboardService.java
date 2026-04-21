package com.roxlease.lease.service;

import com.roxlease.cost.model.Enum.PaymentStatus;
import com.roxlease.cost.model.RecurringCostSchedule;
import com.roxlease.cost.repository.RecurringCostScheduleRepository;
import com.roxlease.lease.dto.DashboardResponse;
import com.roxlease.lease.model.Enum.OptionType;
import com.roxlease.lease.model.Lease;
import com.roxlease.lease.model.LeaseOption;
import com.roxlease.lease.repository.LeaseOptionRepository;
import com.roxlease.lease.repository.LeaseRepository;
import com.roxlease.space.model.Building;
import com.roxlease.space.repository.BuildingRepository;
import com.roxlease.space.repository.SiteRepository;
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
    private final LeaseRepository leaseRepo;
    private final LeaseOptionRepository optionRepo;
    private final SiteRepository siteRepo;
    private final BuildingRepository buildingRepo;
    private final RecurringCostScheduleRepository scheduleRepo;

    public LeaseDashboardService(MongoTemplate mongoTemplate, LeaseRepository leaseRepo, 
                                 LeaseOptionRepository optionRepo, SiteRepository siteRepo, 
                                 BuildingRepository buildingRepo, RecurringCostScheduleRepository scheduleRepo) {
        this.mongoTemplate = mongoTemplate;
        this.leaseRepo = leaseRepo;
        this.optionRepo = optionRepo;
        this.siteRepo = siteRepo;
        this.buildingRepo = buildingRepo;
        this.scheduleRepo = scheduleRepo;
    }

    public DashboardResponse getDashboardData(LocalDate fromDate, LocalDate toDate, String division, String siteId, String buildingId) {
        if (toDate == null) toDate = LocalDate.now();
        if (fromDate == null) fromDate = toDate.minusYears(1);

        // Build base query
        Query query = new Query();
        if (siteId != null && !siteId.isEmpty()) query.addCriteria(Criteria.where("siteId").is(siteId));
        if (buildingId != null && !buildingId.isEmpty()) query.addCriteria(Criteria.where("buildingId").is(buildingId));

        return DashboardResponse.builder()
                .overview(buildOverview(query))
                .amenity(buildAmenityMetrics(query))
                .leaseAlerts(buildLeaseAlerts(query, fromDate, toDate))
                .charts(buildCharts(query, fromDate, toDate))
                .revenue(buildRevenue(query, fromDate, toDate))
                .build();
    }

   private DashboardResponse.Overview buildOverview(Query query) {
        long sites = mongoTemplate.count(query, "sites");
        
        List<Building> buildings = mongoTemplate.find(query, Building.class);
        
        BigDecimal gfa = buildings.stream()
                .map(b -> b.getAreaGrossInt() != null ? BigDecimal.valueOf(b.getAreaGrossInt()) : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal nfa = gfa.multiply(new BigDecimal("0.85")); 
        BigDecimal leasedNfa = gfa.multiply(new BigDecimal("0.60"));
        BigDecimal availableNfa = nfa.subtract(leasedNfa);
        BigDecimal otherArea = gfa.subtract(nfa);

        return DashboardResponse.Overview.builder()
                .totalSites(sites)
                .gfa(gfa)
                .nfa(nfa)
                .leasedNfa(leasedNfa)
                .availableNfa(availableNfa)
                .otherArea(otherArea)
                .build();
    }

    private DashboardResponse.AmenityMetrics buildAmenityMetrics(Query query) {
        long total = mongoTemplate.count(query, "amenities");
        long leased = (long) (total * 0.4); // Logic mẫu, map với LeaseAmenity
        return DashboardResponse.AmenityMetrics.builder()
                .totalAmenities(total)
                .leasedAmenities(leased)
                .availableAmenities(total - leased)
                .build();
    }

    private DashboardResponse.LeaseAlerts buildLeaseAlerts(Query query, LocalDate fromDate, LocalDate toDate) {
        List<Lease> leases = mongoTemplate.find(query, Lease.class);
        LocalDate finalToDate = toDate; // for lambda

        long totalActive = leases.stream().filter(l -> Boolean.TRUE.equals(l.getActive())).count();
        long newLeases = leases.stream()
                .filter(l -> Boolean.TRUE.equals(l.getActive()) && l.getStartDate() != null && !l.getStartDate().isBefore(fromDate))
                .count();

        long leaseEnd = 0;
        long extended = 0;

        for (Lease l : leases) {
            LocalDate effectiveEnd = l.getEndDate();
            List<LeaseOption> options = optionRepo.findByLsIdAndActiveTrue(l.getLsId());
            
            if (options != null && !options.isEmpty()) {
                LocalDate maxExtension = options.stream()
                        .filter(o -> o.getOpType() == OptionType.EXTENSION || o.getOpType() == OptionType.RENEWAL)
                        .map(LeaseOption::getEndDate)
                        .max(LocalDate::compareTo).orElse(null);

                LocalDate minTermination = options.stream()
                        .filter(o -> o.getOpType() == OptionType.EARLY_TERMINATION)
                        .map(LeaseOption::getStartDate)
                        .min(LocalDate::compareTo).orElse(null);

                if (maxExtension != null && (effectiveEnd == null || maxExtension.isAfter(effectiveEnd))) {
                    effectiveEnd = maxExtension;
                    if (maxExtension.isAfter(finalToDate)) extended++;
                }
                if (minTermination != null && (effectiveEnd == null || minTermination.isBefore(effectiveEnd))) {
                    effectiveEnd = minTermination;
                }
            }

            if (effectiveEnd != null && !effectiveEnd.isAfter(finalToDate)) {
                leaseEnd++;
            }
        }

        return DashboardResponse.LeaseAlerts.builder()
                .totalLeases(totalActive).newLeases(newLeases)
                .leaseEnd(leaseEnd).extended(extended)
                .build();
    }

    private DashboardResponse.Charts buildCharts(Query query, LocalDate fromDate, LocalDate toDate) {
        // 1. Contract Expiration (Mock Grouping)
        List<DashboardResponse.ChartData> expiration = Arrays.asList(
                DashboardResponse.ChartData.builder().name("< 1 month").value(12).build(),
                DashboardResponse.ChartData.builder().name("1 - 3 months").value(24).build(),
                DashboardResponse.ChartData.builder().name("> 3 months").value(45).build()
        );

        // 2. Overdue Payment
        List<RecurringCostSchedule> schedules = scheduleRepo.findAll();
        long less270 = schedules.stream()
                .filter(s -> s.getPaymentStatus() == PaymentStatus.PENDING && s.getDueDate() != null 
                             && ChronoUnit.DAYS.between(s.getDueDate(), LocalDate.now()) < 270 
                             && s.getDueDate().isBefore(LocalDate.now()))
                .count();

        long more270 = schedules.stream()
                .filter(s -> s.getPaymentStatus() == PaymentStatus.PENDING && s.getDueDate() != null 
                             && ChronoUnit.DAYS.between(s.getDueDate(), LocalDate.now()) >= 270)
                .count();

        List<DashboardResponse.ChartData> overdue = Arrays.asList(
                DashboardResponse.ChartData.builder().name("< 270 Days Overdue").value(less270).build(),
                DashboardResponse.ChartData.builder().name("> 270 Days Overdue").value(more270).build()
        );

        return DashboardResponse.Charts.builder()
                .priceAdjustment(Collections.emptyList()) // Implement Clause Aggregation here
                .contractExpiration(expiration)
                .overduePayment(overdue)
                .build();
    }

    private DashboardResponse.RevenueMetrics buildRevenue(Query query, LocalDate fromDate, LocalDate toDate) {
        // Tương tự, dùng repository để SUM amountInBase cho Actual / Forecast
        DashboardResponse.RevenueDetail contract = DashboardResponse.RevenueDetail.builder()
                .actual(new BigDecimal("1500000"))
                .forecast(new BigDecimal("1800000"))
                .planned(new BigDecimal("2000000"))
                .build();

        DashboardResponse.KPICards kpi = DashboardResponse.KPICards.builder()
                .annualPlan(new BigDecimal("24000000"))
                .actualToDate(new BigDecimal("1500000"))
                .planToDate(new BigDecimal("2000000"))
                .annualForecast(new BigDecimal("22000000"))
                .planAchievement(75.0)
                .ytdAchievement(75.0)
                .forecastAchievement(91.6)
                .actualOcc(85.5)
                .forecastOcc(90.2)
                .build();

        return DashboardResponse.RevenueMetrics.builder()
                .contract(contract)
                .kpi(kpi)
                .build();
    }
}