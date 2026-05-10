package com.roxlease.lease.service;

import com.roxlease.cost.model.Enum.CostType;
import com.roxlease.cost.model.Enum.PaymentStatus;
import com.roxlease.lease.model.Enum.ClauseType;
import com.roxlease.cost.model.Enum.ScheduleStatus;
import com.roxlease.cost.model.Enum.Category;
import com.roxlease.cost.model.PlannedRevenue;
import com.roxlease.cost.model.RecurringCost;
import com.roxlease.cost.model.RecurringCostSchedule;
import com.roxlease.lease.dto.DashboardResponse;
import com.roxlease.lease.model.*;
import com.roxlease.lease.model.Enum.OptionType;
import com.roxlease.space.model.Amenity;
import com.roxlease.space.model.Building;
import com.roxlease.space.model.Enum.AmenityType;
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
        LocalDate finalToDate = (toDate != null) ? toDate : LocalDate.now();
        LocalDate finalFromDate = (fromDate != null) ? fromDate : finalToDate.minusYears(1);

        Query spaceQuery = new Query();
        if (siteId != null && !siteId.isEmpty()) spaceQuery.addCriteria(Criteria.where("siteId").is(siteId));
        if (buildingId != null && !buildingId.isEmpty()) spaceQuery.addCriteria(Criteria.where("buildingId").is(buildingId));

        return DashboardResponse.builder()
                .overview(buildOverview(spaceQuery))
                .amenity(buildAmenity(spaceQuery))
                .leaseAlerts(buildLeaseAlerts(finalFromDate, finalToDate))
                .charts(buildCharts(finalToDate))
                .revenue(buildRevenueMetrics(finalFromDate, finalToDate, spaceQuery))
                .build();
    }

    // =========================================================
    // OVERVIEW
    // =========================================================
    private DashboardResponse.Overview buildOverview(Query query) {
        List<Building> buildings = mongoTemplate.find(query, Building.class);
        List<Room> rooms = mongoTemplate.find(query, Room.class);
        List<Suite> suites = mongoTemplate.find(query, Suite.class);
        List<LeaseSuite> leaseSuites = mongoTemplate.findAll(LeaseSuite.class);

        long totalSites = buildings.stream().map(Building::getSiteId).filter(Objects::nonNull).distinct().count();

        BigDecimal gfa = buildings.stream()
                .map(b -> b.getAreaGrossInt() != null ? BigDecimal.valueOf(b.getAreaGrossInt()) : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal nfa = rooms.stream()
                .map(r -> r.getArea() != null ? BigDecimal.valueOf(r.getArea()) : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Set<String> leasedSuiteIds = leaseSuites.stream().map(LeaseSuite::getSuId).collect(Collectors.toSet());
        BigDecimal leasedNfa = suites.stream()
                .filter(s -> leasedSuiteIds.contains(s.getSuiteId()))
                .map(s -> s.getArea() != null ? BigDecimal.valueOf(s.getArea()) : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal availableNfa = suites.stream()
                .filter(s -> !leasedSuiteIds.contains(s.getSuiteId()))
                .map(s -> s.getArea() != null ? BigDecimal.valueOf(s.getArea()) : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal otherArea = gfa.subtract(leasedNfa).subtract(availableNfa);
        if (otherArea.compareTo(BigDecimal.ZERO) < 0) otherArea = BigDecimal.ZERO;

        return DashboardResponse.Overview.builder()
                .totalSites(totalSites).gfa(gfa).nfa(nfa)
                .leasedNfa(leasedNfa).availableNfa(availableNfa).otherArea(otherArea)
                .build();
    }

    // =========================================================
    // AMENITIES
    // =========================================================
    private DashboardResponse.AmenityMetrics buildAmenity(Query query) {
        List<Amenity> amenities = mongoTemplate.find(query, Amenity.class);
        List<LeaseAmenity> leaseAmenities = mongoTemplate.findAll(LeaseAmenity.class);

        long totalAmenities = amenities.size();
        Set<String> leasedAmenityIds = leaseAmenities.stream().map(LeaseAmenity::getAmenityId).collect(Collectors.toSet());
        
        long leasedCount = amenities.stream()
                .filter(a -> leasedAmenityIds.contains(a.getAmenityId()))
                .count();

        return DashboardResponse.AmenityMetrics.builder()
                .totalAmenities(totalAmenities)
                .leasedAmenities(leasedCount)
                .availableAmenities(totalAmenities - leasedCount)
                .build();
    }

    // =========================================================
    // LEASE ALERTS
    // =========================================================
    private DashboardResponse.LeaseAlerts buildLeaseAlerts(LocalDate fromDate, LocalDate toDate) {
        List<Lease> leases = mongoTemplate.findAll(Lease.class);
        List<LeaseOption> options = mongoTemplate.findAll(LeaseOption.class);

        long totalActive = 0, newLeases = 0, leaseEndCount = 0, extendedCount = 0;

        for (Lease ls : leases) {
            if (!Boolean.TRUE.equals(ls.getActive())) continue;
            totalActive++; 

            if (ls.getStartDate() != null && !ls.getStartDate().isBefore(fromDate)) {
                newLeases++;
            }

            List<LeaseOption> lsOps = options.stream()
                    .filter(o -> o.getLsId().equals(ls.getLsId()) && Boolean.TRUE.equals(o.getActive()))
                    .collect(Collectors.toList());

            LeaseOption lastExtension = lsOps.stream()
                    .filter(o -> o.getOpType() == OptionType.EXTENSION)
                    .max(Comparator.comparing(LeaseOption::getEndDate, Comparator.nullsFirst(Comparator.naturalOrder())))
                    .orElse(null);

            LeaseOption lastEarlyTerm = lsOps.stream()
                    .filter(o -> o.getOpType() == OptionType.EARLY_TERMINATION)
                    .max(Comparator.comparing(LeaseOption::getEndDate, Comparator.nullsFirst(Comparator.naturalOrder())))
                    .orElse(null);

            boolean hasExtOrTerm = (lastExtension != null || lastEarlyTerm != null);
            if (!hasExtOrTerm) {
                if (ls.getEndDate() != null && ls.getEndDate().isBefore(toDate)) leaseEndCount++;
            } else {
                boolean extEndBefore = (lastExtension != null && lastExtension.getEndDate() != null && lastExtension.getEndDate().isBefore(toDate));
                boolean termEndBefore = (lastEarlyTerm != null && lastEarlyTerm.getEndDate() != null && lastEarlyTerm.getEndDate().isBefore(toDate));
                if (extEndBefore || termEndBefore) leaseEndCount++;
            }

            if (lastExtension != null && lastExtension.getStartDate() != null && lastExtension.getEndDate() != null) {
                if (lastExtension.getStartDate().isAfter(fromDate)) {
                    boolean extEndAfter = lastExtension.getEndDate().isAfter(toDate);
                    boolean termEndAfter = (lastEarlyTerm != null && lastEarlyTerm.getEndDate() != null && lastEarlyTerm.getEndDate().isAfter(toDate));
                    if (extEndAfter || termEndAfter) {
                        extendedCount++;
                    }
                }
            }
        }

        return DashboardResponse.LeaseAlerts.builder()
                .totalLeases(totalActive).newLeases(newLeases)
                .leaseEnd(leaseEndCount).extended(extendedCount)
                .build();
    }

    // =========================================================
    // CHARTS
    // =========================================================
    private DashboardResponse.Charts buildCharts(LocalDate toDate) {
        List<Lease> leases = mongoTemplate.findAll(Lease.class);
        List<LeaseOption> options = mongoTemplate.findAll(LeaseOption.class);
        List<RecurringCostSchedule> schedules = mongoTemplate.findAll(RecurringCostSchedule.class);
        List<Clause> clauses = mongoTemplate.findAll(Clause.class);
        List<RecurringCost> recurringCosts = mongoTemplate.findAll(RecurringCost.class);
        
        List<Map<String, Object>> exp1MList = new ArrayList<>();
        List<Map<String, Object>> exp3MList = new ArrayList<>();
        List<Map<String, Object>> exp6MList = new ArrayList<>();
        List<Map<String, Object>> expOverdueList = new ArrayList<>();

        long exp1M = 0, exp3M = 0, exp6M = 0, expOverdue = 0;
        for (Lease ls : leases) {
            if (!Boolean.TRUE.equals(ls.getActive())) continue;
            
            List<LeaseOption> lsOps = options.stream().filter(o -> o.getLsId().equals(ls.getLsId()) && Boolean.TRUE.equals(o.getActive())).collect(Collectors.toList());
            if (lsOps.stream().anyMatch(o -> o.getOpType() == OptionType.LEASE_END)) continue; 

            LocalDate effectiveEnd = ls.getEndDate();
            LeaseOption lastExtOrTerm = lsOps.stream()
                    .filter(o -> o.getOpType() == OptionType.EXTENSION || o.getOpType() == OptionType.EARLY_TERMINATION)
                    .max(Comparator.comparing(LeaseOption::getEndDate, Comparator.nullsFirst(Comparator.naturalOrder())))
                    .orElse(null);

            if (lastExtOrTerm != null && lastExtOrTerm.getEndDate() != null) {
                effectiveEnd = lastExtOrTerm.getEndDate();
            }

            if (effectiveEnd != null) {
                long daysLeft = ChronoUnit.DAYS.between(LocalDate.now(), effectiveEnd); 
                Map<String, Object> detail = new HashMap<>();
                detail.put("id", ls.getLsId());
                detail.put("name", ls.getPartyId() != null ? ls.getPartyId() : "N/A");
                detail.put("value", effectiveEnd.toString());
                
                if (daysLeft < 0) { expOverdue++; expOverdueList.add(detail); }
                else if (daysLeft <= 30) { exp1M++; exp1MList.add(detail); }
                else if (daysLeft <= 90) { exp3M++; exp3MList.add(detail); }
                else if (daysLeft <= 180) { exp6M++; exp6MList.add(detail); }
            }
        }

        List<Map<String, Object>> overdue270List = new ArrayList<>();
        List<Map<String, Object>> overdueMore270List = new ArrayList<>();
        List<Map<String, Object>> paidLateList = new ArrayList<>();

        long overdue270 = 0, overdueMore270 = 0, paidLate = 0;
        for (RecurringCostSchedule sch : schedules) {
            if (sch.getDueDate() == null) continue;
            
            if (sch.getPaymentStatus() == PaymentStatus.PENDING || sch.getPaymentStatus() == null) { 
                long delay = ChronoUnit.DAYS.between(sch.getDueDate(), LocalDate.now()); 
                if (delay > 0) {
                    Map<String, Object> detail = new HashMap<>();
                    detail.put("id", sch.getLeaseId() != null ? sch.getLeaseId() : "N/A");
                    detail.put("name", sch.getCostType() != null ? sch.getCostType().name() : "N/A");
                    detail.put("value", (sch.getAmountInBase() != null ? sch.getAmountInBase() : "0") + " VND");

                    if (delay <= 270) { overdue270++; overdue270List.add(detail); }
                    else { overdueMore270++; overdueMore270List.add(detail); }
                }
            } else if (sch.getPaymentStatus() == PaymentStatus.PAID) { 
                if (sch.getPaymentDate() != null && sch.getDueDate().isBefore(sch.getPaymentDate())) {
                    Map<String, Object> detail = new HashMap<>();
                    detail.put("id", sch.getLeaseId() != null ? sch.getLeaseId() : "N/A");
                    detail.put("name", sch.getCostType() != null ? sch.getCostType().name() : "N/A");
                    detail.put("value", (sch.getAmountInBase() != null ? sch.getAmountInBase() : "0") + " VND");

                    paidLate++; paidLateList.add(detail);
                }
            }
        }

        List<Map<String, Object>> adj1MList = new ArrayList<>();
        List<Map<String, Object>> adj3MList = new ArrayList<>();
        List<Map<String, Object>> adj6MList = new ArrayList<>();
        List<Map<String, Object>> adjOverdueList = new ArrayList<>();

        long adj1M = 0, adj3M = 0, adj6M = 0, adjOverdue = 0;
        for (Clause clause : clauses) {
            if (!Boolean.TRUE.equals(clause.getActive()) || clause.getClauseType() != ClauseType.RENT_ESCALATION) continue;
            
            // Lọc theo lease active (bao gồm cả hợp đồng còn hạn hoặc đã hết hạn nhưng vẫn active)
            boolean isLeaseActive = leases.stream().anyMatch(ls -> 
                ls.getLsId().equals(clause.getLeaseId()) && Boolean.TRUE.equals(ls.getActive())
            );
            if (!isLeaseActive) continue;

            boolean hasMatchingCost = recurringCosts.stream().anyMatch(rc -> 
                Boolean.TRUE.equals(rc.getActive()) &&
                rc.getLsId().equals(clause.getLeaseId()) &&
                Objects.equals(rc.getStartDate(), clause.getStartDate()) &&
                Objects.equals(rc.getEndDate(), clause.getEndDate())
            );

            if (!hasMatchingCost && clause.getStartDate() != null) {
                long days = ChronoUnit.DAYS.between(toDate, clause.getStartDate()); 
                Map<String, Object> detail = new HashMap<>();
                detail.put("id", clause.getClauseId() != null ? clause.getClauseId() : "N/A");
                detail.put("name", "Lease: " + clause.getLeaseId());
                detail.put("value", clause.getStartDate().toString());

                if (days < 0) { adjOverdue++; adjOverdueList.add(detail); }
                else if (days <= 30) { adj1M++; adj1MList.add(detail); }
                else if (days <= 90) { adj3M++; adj3MList.add(detail); }
                else if (days <= 180) { adj6M++; adj6MList.add(detail); }
            }
        }

        return DashboardResponse.Charts.builder()
                .contractExpiration(Arrays.asList(
                        DashboardResponse.ChartData.builder().name("< 1 Month").value(exp1M).details(exp1MList).build(),
                        DashboardResponse.ChartData.builder().name("1-3 Months").value(exp3M).details(exp3MList).build(),
                        DashboardResponse.ChartData.builder().name("3-6 Months").value(exp6M).details(exp6MList).build(),
                        DashboardResponse.ChartData.builder().name("Overdue").value(expOverdue).details(expOverdueList).build()))
                .overduePayment(Arrays.asList(
                        DashboardResponse.ChartData.builder().name("< 270 Days").value(overdue270).details(overdue270List).build(),
                        DashboardResponse.ChartData.builder().name("> 270 Days").value(overdueMore270).details(overdueMore270List).build(),
                        DashboardResponse.ChartData.builder().name("Paid Late").value(paidLate).details(paidLateList).build()))
                .priceAdjustment(Arrays.asList(
                        DashboardResponse.ChartData.builder().name("< 1 Month").value(adj1M).details(adj1MList).build(),
                        DashboardResponse.ChartData.builder().name("1-3 Months").value(adj3M).details(adj3MList).build(),
                        DashboardResponse.ChartData.builder().name("3-6 Months").value(adj6M).details(adj6MList).build(),
                        DashboardResponse.ChartData.builder().name("Overdue").value(adjOverdue).details(adjOverdueList).build()))
                .build();
    }

    // =========================================================
    // 5. REVENUE & OCC KPIs VÀ DỮ LIỆU BIỂU ĐỒ 12 THÁNG
    // =========================================================
    private DashboardResponse.RevenueMetrics buildRevenueMetrics(LocalDate fromDate, LocalDate toDate, Query spaceQuery) {
        List<Lease> allLeases = mongoTemplate.findAll(Lease.class);
        List<LeaseAmenity> leaseAmenities = mongoTemplate.findAll(LeaseAmenity.class);
        List<RecurringCostSchedule> schedules = mongoTemplate.findAll(RecurringCostSchedule.class);
        
        // 🚀 ĐÃ FIX: Dùng Document để lấy dữ liệu tránh lỗi MappingException từ Enum Category
        List<org.bson.Document> allPlans = mongoTemplate.find(new Query(), org.bson.Document.class, "planned_revenues");

        List<Room> rooms = mongoTemplate.find(spaceQuery, Room.class);
        BigDecimal nfa = rooms.stream().map(r -> r.getArea() != null ? BigDecimal.valueOf(r.getArea()) : BigDecimal.ZERO).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal safeNfa = nfa.compareTo(BigDecimal.ZERO) == 0 ? BigDecimal.ONE : nfa;

        Set<String> leasesWithAmenity = leaseAmenities.stream().map(LeaseAmenity::getLsId).collect(Collectors.toSet());
        List<Lease> nonAmenityLeases = allLeases.stream().filter(l -> !leasesWithAmenity.contains(l.getLsId())).collect(Collectors.toList());

        List<org.bson.Document> contractPlans = new ArrayList<>();
        List<org.bson.Document> servicePlans = new ArrayList<>();
        List<org.bson.Document> amenityPlans = new ArrayList<>();

        for (org.bson.Document p : allPlans) {
            String catStr = p.getString("category");
            if (catStr == null) continue;
            String catUpper = catStr.toUpperCase().replace(" ", "_");
            
            if (catUpper.contains("RENTAL") || catUpper.contains("INCOME_BASE_RENT")) {
                contractPlans.add(p);
            } else if (catUpper.contains("SERVICE") || catUpper.contains("INCOME_BASE_SERVICE")) {
                servicePlans.add(p);
            } else {
                amenityPlans.add(p);
            }
        }

        // Lấy KPI Cards
        DashboardResponse.KPICards contractKpi = calculateRevenueKPI(schedules.stream().filter(s -> !leasesWithAmenity.contains(s.getLeaseId()) && s.getCostType() == CostType.BASERENT).collect(Collectors.toList()), contractPlans, toDate, 0, 0);

        int currentYear = toDate.getYear();
        List<DashboardResponse.MonthlyRevenue> contractChart = buildMonthlyChart(schedules, contractPlans, CostType.BASERENT, currentYear, nonAmenityLeases, safeNfa);
        List<DashboardResponse.MonthlyRevenue> serviceChart = buildMonthlyChart(schedules, servicePlans, CostType.BASESERVICE, currentYear, nonAmenityLeases, safeNfa);
        List<DashboardResponse.AmenityRevenueData> amenityChart = buildAmenityChart(schedules, amenityPlans, currentYear, leasesWithAmenity);

        return DashboardResponse.RevenueMetrics.builder()
                .contract(contractChart)
                .serviceFee(serviceChart)
                .amenity(amenityChart)
                .kpi(contractKpi) 
                .build();
    }

    private List<DashboardResponse.MonthlyRevenue> buildMonthlyChart(List<RecurringCostSchedule> allSchedules, List<org.bson.Document> plans, CostType costType, int year, List<Lease> leases, BigDecimal safeNfa) {
        List<DashboardResponse.MonthlyRevenue> monthlyData = new ArrayList<>();
        
        for (int m = 1; m <= 12; m++) {
            final int month = m;
            
            BigDecimal actual = allSchedules.stream()
                .filter(s -> s.getCostType() == costType && s.getPaymentStatus() == PaymentStatus.PAID && s.getDueDate() != null && s.getDueDate().getYear() == year && s.getDueDate().getMonthValue() == month)
                .map(s -> s.getAmountInBase() != null ? s.getAmountInBase() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal forecast = allSchedules.stream()
                .filter(s -> s.getCostType() == costType && s.getPaymentStatus() != PaymentStatus.REJECTED && s.getDueDate() != null && s.getDueDate().getYear() == year && s.getDueDate().getMonthValue() == month)
                .map(s -> s.getAmountInBase() != null ? s.getAmountInBase() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal planned = plans.stream()
                .filter(p -> getYearFromDoc(p) == year && getMonthFromDoc(p) == month)
                .map(p -> getCostFromDoc(p, "plannedCost", "plan_cost", "planned_cost"))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

            // 🚀 Lấy Planned OCC Nhập tay từ DB
            double plannedOcc = plans.stream()
                .filter(p -> getYearFromDoc(p) == year && getMonthFromDoc(p) == month && getCostFromDoc(p, "plannedOcc", "planned_occ").compareTo(BigDecimal.ZERO) > 0)
                .mapToDouble(p -> getCostFromDoc(p, "plannedOcc", "planned_occ").doubleValue())
                .findFirst().orElse(0.0);

            double actualOcc = 0;
            if (costType == CostType.BASERENT) {
                BigDecimal occSum = leases.stream().filter(l -> Boolean.TRUE.equals(l.getActive()))
                        .map(l -> l.getAreaNegotiated() != null ? BigDecimal.valueOf(l.getAreaNegotiated()) : BigDecimal.ZERO)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
                actualOcc = occSum.divide(safeNfa, 4, RoundingMode.HALF_UP).multiply(new BigDecimal("100")).doubleValue();
            }

            monthlyData.add(DashboardResponse.MonthlyRevenue.builder()
                .month("T" + month)
                .actual(actual).planned(planned).forecast(forecast)
                .actualOcc(actualOcc).plannedOcc(plannedOcc).forecastOcc(actualOcc + 2)
                .build());
        }
        return monthlyData;
    }

    // 🚀 HÀM PHÂN LOẠI CATEGORY CHO AMENITY DÙNG PLAN THEO CATEGORY
    private List<DashboardResponse.AmenityRevenueData> buildAmenityChart(List<RecurringCostSchedule> schedules, List<org.bson.Document> plans, int year, Set<String> amenityLeaseIds) {
        List<Amenity> allAmenities = mongoTemplate.findAll(Amenity.class);
        List<LeaseAmenity> allLeaseAmenities = mongoTemplate.findAll(LeaseAmenity.class);

        Map<String, AmenityType> amenityTypeMap = allAmenities.stream()
                .filter(a -> a.getAmenityId() != null && a.getAmenityType() != null)
                .collect(Collectors.toMap(Amenity::getAmenityId, Amenity::getAmenityType, (e, r) -> e));

        Map<String, List<AmenityType>> leaseToAmenityTypes = new HashMap<>();
        for (LeaseAmenity la : allLeaseAmenities) {
            if (la.getLsId() != null && la.getAmenityId() != null) {
                AmenityType type = amenityTypeMap.get(la.getAmenityId());
                if (type != null) leaseToAmenityTypes.computeIfAbsent(la.getLsId(), k -> new ArrayList<>()).add(type);
            }
        }

        String[] categories = {"Parking Area", "Billboard", "Pool", "Event Hall", "Other"};
        Map<String, BigDecimal> actualMap = new HashMap<>();
        Map<String, BigDecimal> plannedMap = new HashMap<>();
        for (String cat : categories) {
            actualMap.put(cat, BigDecimal.ZERO);
            plannedMap.put(cat, BigDecimal.ZERO);
        }

        java.util.function.Function<AmenityType, String> mapTypeToStr = (type) -> {
            if (type == AmenityType.PARKING_AREA) return "Parking Area";
            if (type == AmenityType.BILLBOARD) return "Billboard";
            if (type == AmenityType.POOL) return "Pool";
            if (type == AmenityType.EVENT_HALL) return "Event Hall";
            return "Other";
        };

        // Actual Revenue (Từ Schedule chứa LeaseId)
        for (RecurringCostSchedule s : schedules) {
            if (amenityLeaseIds.contains(s.getLeaseId()) && s.getPaymentStatus() == PaymentStatus.PAID && s.getDueDate() != null && s.getDueDate().getYear() == year) {
                BigDecimal amount = s.getAmountInBase() != null ? s.getAmountInBase() : BigDecimal.ZERO;
                List<AmenityType> types = leaseToAmenityTypes.get(s.getLeaseId());
                if (types != null && !types.isEmpty()) {
                    BigDecimal splitAmount = amount.divide(new BigDecimal(types.size()), 2, RoundingMode.HALF_UP);
                    for (AmenityType type : types) {
                        String cat = mapTypeToStr.apply(type);
                        actualMap.put(cat, actualMap.get(cat).add(splitAmount));
                    }
                }
            }
        }

        for (org.bson.Document p : plans) {
            if (getYearFromDoc(p) == year) {
                BigDecimal cost = getCostFromDoc(p, "plannedCost", "plan_cost", "planned_cost");
                if (cost.compareTo(BigDecimal.ZERO) > 0) {
                    String catName = p.getString("category");
                    if (catName == null) catName = "Other";
                    
                    boolean matched = false;
                    for (String c : categories) {
                        if (c.equalsIgnoreCase(catName) || catName.toUpperCase().contains(c.toUpperCase().replace(" ", "_"))) {
                            plannedMap.put(c, plannedMap.get(c).add(cost));
                            matched = true;
                            break;
                        }
                    }
                    if (!matched) plannedMap.put("Other", plannedMap.get("Other").add(cost));
                }
            }
        }

        List<DashboardResponse.AmenityRevenueData> list = new ArrayList<>();
        for (String cat : categories) {
            list.add(DashboardResponse.AmenityRevenueData.builder()
                .category(cat).actual(actualMap.get(cat)).planned(plannedMap.get(cat)).build());
        }
        return list;
    }

    private DashboardResponse.KPICards calculateRevenueKPI(List<RecurringCostSchedule> schedules, List<org.bson.Document> plans, LocalDate toDate, double actualOcc, double forecastOcc) {
        int currentYear = toDate.getYear();
        int currentMonth = toDate.getMonthValue();

        BigDecimal actualToDate = schedules.stream()
                .filter(s -> s.getPaymentStatus() == PaymentStatus.PAID && s.getDueDate() != null && s.getDueDate().getYear() == currentYear && !s.getDueDate().isAfter(toDate))
                .map(s -> s.getAmountInBase() != null ? s.getAmountInBase() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal annualForecast = schedules.stream()
                .filter(s -> s.getPaymentStatus() != PaymentStatus.REJECTED && s.getDueDate() != null && s.getDueDate().getYear() == currentYear)
                .map(s -> s.getAmountInBase() != null ? s.getAmountInBase() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal annualPlan = BigDecimal.ZERO;
        BigDecimal planToDate = BigDecimal.ZERO;
        for (org.bson.Document p : plans) {
            if (getYearFromDoc(p) == currentYear) {
                BigDecimal cost = getCostFromDoc(p, "plannedCost", "plan_cost", "planned_cost");
                annualPlan = annualPlan.add(cost);
                
                int m = getMonthFromDoc(p);
                if (m > 0 && m <= currentMonth) {
                    planToDate = planToDate.add(cost);
                }
            }
        }

        BigDecimal safeAnnualPlan = annualPlan.compareTo(BigDecimal.ZERO) == 0 ? BigDecimal.ONE : annualPlan;
        BigDecimal safePlanToDate = planToDate.compareTo(BigDecimal.ZERO) == 0 ? BigDecimal.ONE : planToDate;

        double planAchievement = actualToDate.divide(safeAnnualPlan, 4, RoundingMode.HALF_UP).multiply(new BigDecimal("100")).doubleValue();
        double forecastAchievement = annualForecast.divide(safeAnnualPlan, 4, RoundingMode.HALF_UP).multiply(new BigDecimal("100")).doubleValue();
        double ytdAchievement = actualToDate.divide(safePlanToDate, 4, RoundingMode.HALF_UP).multiply(new BigDecimal("100")).doubleValue();

        return DashboardResponse.KPICards.builder()
                .annualPlan(annualPlan).planToDate(planToDate).actualToDate(actualToDate).annualForecast(annualForecast)
                .planAchievement(planAchievement).forecastAchievement(forecastAchievement).ytdAchievement(ytdAchievement)
                .actualOcc(actualOcc).forecastOcc(forecastOcc)
                .build();
    }

    // --- Helper methods for safe mapping ---
    private int getYearFromDoc(org.bson.Document p) {
        if (p.get("year") != null) return Integer.parseInt(p.get("year").toString());
        java.util.Date d = p.getDate("end_date");
        if (d != null) return d.toInstant().atZone(java.time.ZoneId.systemDefault()).toLocalDate().getYear();
        return -1;
    }

    private int getMonthFromDoc(org.bson.Document p) {
        if (p.get("month") != null) return Integer.parseInt(p.get("month").toString());
        java.util.Date d = p.getDate("end_date");
        if (d != null) return d.toInstant().atZone(java.time.ZoneId.systemDefault()).toLocalDate().getMonthValue();
        return -1;
    }

    private BigDecimal getCostFromDoc(org.bson.Document p, String... keys) {
        for (String k : keys) {
            Object val = p.get(k);
            if (val != null) return new BigDecimal(val.toString());
        }
        return BigDecimal.ZERO;
    }
}