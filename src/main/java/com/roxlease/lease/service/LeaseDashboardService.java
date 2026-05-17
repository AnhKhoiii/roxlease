package com.roxlease.lease.service;

import com.roxlease.cost.model.Enum.CostType;
import com.roxlease.cost.model.Enum.PaymentStatus;
import com.roxlease.lease.model.Enum.ClauseType;
import com.roxlease.cost.model.Enum.ScheduleStatus;
import com.roxlease.cost.model.Enum.Category;
import com.roxlease.cost.model.Enum.Period;
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
import com.roxlease.space.model.Floor;
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

    private static final String KEY_RENT = "RENT";
    private static final String KEY_SERVICE = "SERVICE";
    private static final String STATUS_SCHEDULED = "SCHEDULE";

    public LeaseDashboardService(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    public DashboardResponse getDashboardData(LocalDate fromDate, LocalDate toDate, String division, String siteId, String buildingId) {
        LocalDate finalToDate = (toDate != null) ? toDate : LocalDate.now();
        LocalDate finalFromDate = (fromDate != null) ? fromDate : finalToDate.minusYears(1);

        Query buildingQuery = new Query();
        if (siteId != null && !siteId.isEmpty()) buildingQuery.addCriteria(Criteria.where("siteId").is(siteId));
        if (buildingId != null && !buildingId.isEmpty()) buildingQuery.addCriteria(Criteria.where("blId").is(buildingId));

        List<Building> buildings = mongoTemplate.find(buildingQuery, Building.class);
        List<String> bIds = buildings.stream().map(Building::getBlId).collect(Collectors.toList());

        Query floorQuery = new Query();
        if (!bIds.isEmpty()) {
            floorQuery.addCriteria(Criteria.where("blId").in(bIds));
        } else if (siteId != null || buildingId != null) {
            floorQuery.addCriteria(Criteria.where("blId").is("NO_MATCH"));
        }
        List<Floor> floors = mongoTemplate.find(floorQuery, Floor.class);
        List<String> fIds = floors.stream().map(Floor::getFlId).collect(Collectors.toList());

        Query spaceSubQuery = new Query();
        if (!fIds.isEmpty()) {
            spaceSubQuery.addCriteria(Criteria.where("flId").in(fIds));
        } else if (siteId != null || buildingId != null) {
            spaceSubQuery.addCriteria(Criteria.where("flId").is("NO_MATCH"));
        }

        List<Room> rooms = mongoTemplate.find(spaceSubQuery, Room.class);
        List<Suite> suites = mongoTemplate.find(spaceSubQuery, Suite.class);

        return DashboardResponse.builder()
                .overview(buildOverview(buildings, floors, rooms, suites))
                .amenity(buildAmenity(siteId, buildingId, bIds))
                .leaseAlerts(buildLeaseAlerts(finalFromDate, finalToDate, siteId, buildingId))
                .charts(buildCharts(finalToDate, siteId, buildingId))
                .revenue(buildRevenueMetrics(finalFromDate, finalToDate, floors, rooms, suites, siteId, buildingId))
                .build();
    }

    // =========================================================
    // OVERVIEW
    // =========================================================
    private DashboardResponse.Overview buildOverview(List<Building> buildings, List<Floor> floors, List<Room> rooms, List<Suite> suites) {
        List<LeaseSuite> leaseSuites = mongoTemplate.findAll(LeaseSuite.class);

        long totalSites = buildings.stream().map(Building::getSiteId).filter(Objects::nonNull).distinct().count();

        // 🚀 Cập nhật GFA: Tính bằng tổng GFA của các Floor thay vì Building để tránh sai lệch
        BigDecimal gfa = floors.stream()
                .map(f -> f.getGfa() != null ? BigDecimal.valueOf(f.getGfa()) : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal nfa = rooms.stream()
                .map(r -> r.getArea() != null ? BigDecimal.valueOf(r.getArea()) : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal suitesNfa = suites.stream()
                .map(s -> s.getArea() != null ? BigDecimal.valueOf(s.getArea()) : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        nfa = nfa.add(suitesNfa);

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
    private DashboardResponse.AmenityMetrics buildAmenity(String siteId, String buildingId, List<String> bIds) {
        Query amenityQuery = new Query();
        if (buildingId != null && !buildingId.isEmpty()) {
            amenityQuery.addCriteria(new Criteria().orOperator(
                Criteria.where("buildingId").is(buildingId),
                Criteria.where("blId").is(buildingId)
            ));
        } else if (siteId != null && !siteId.isEmpty()) {
            if (bIds != null && !bIds.isEmpty()) {
                amenityQuery.addCriteria(new Criteria().orOperator(
                    Criteria.where("siteId").is(siteId),
                    Criteria.where("buildingId").in(bIds),
                    Criteria.where("blId").in(bIds)
                ));
            } else {
                amenityQuery.addCriteria(Criteria.where("siteId").is(siteId));
            }
        }
        List<Amenity> amenities = mongoTemplate.find(amenityQuery, Amenity.class);
        List<LeaseAmenity> leaseAmenities = mongoTemplate.findAll(LeaseAmenity.class);

        long totalAmenities = amenities.size();
        Set<String> leasedAmenityIds = leaseAmenities.stream().map(LeaseAmenity::getAmenityId).collect(Collectors.toSet());

        List<org.bson.Document> leaseDocs = mongoTemplate.findAll(org.bson.Document.class, "leases");
        for (org.bson.Document doc : leaseDocs) {
            if (!Boolean.TRUE.equals(doc.getBoolean("active"))) continue;
            String amId = doc.getString("amenity_id") != null ? doc.getString("amenity_id") : doc.getString("amenityId");
            if (amId != null) leasedAmenityIds.add(amId);
            
            List<?> amIds = doc.get("amenity_ids", List.class) != null ? doc.get("amenity_ids", List.class) : doc.get("amenityIds", List.class);
            if (amIds != null) {
                for (Object idObj : amIds) {
                    if (idObj instanceof String) leasedAmenityIds.add((String) idObj);
                }
            }
        }
        
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
    private DashboardResponse.LeaseAlerts buildLeaseAlerts(LocalDate fromDate, LocalDate toDate, String siteId, String buildingId) {
        Query leaseQuery = new Query();
        if (siteId != null && !siteId.isEmpty()) leaseQuery.addCriteria(Criteria.where("siteId").is(siteId));
        if (buildingId != null && !buildingId.isEmpty()) {
            leaseQuery.addCriteria(new Criteria().orOperator(
                Criteria.where("blId").is(buildingId),
                Criteria.where("buildingId").is(buildingId)
            ));
        }
        List<Lease> leases = mongoTemplate.find(leaseQuery, Lease.class);
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
    // HELPER: Tính toán ngày kết thúc hợp đồng thực tế (Đã trừ hao Options)
    // =========================================================
    private LocalDate getEffectiveEndDate(Lease lease, List<LeaseOption> lsOps) {
        LocalDate effectiveEnd = lease.getEndDate();

        LocalDate maxExtension = lsOps.stream()
                .filter(o -> o.getOpType() == OptionType.EXTENSION || o.getOpType() == OptionType.RENEWAL)
                .map(LeaseOption::getEndDate)
                .filter(Objects::nonNull)
                .max(LocalDate::compareTo)
                .orElse(null);

        LocalDate minTermination = lsOps.stream()
                .filter(o -> o.getOpType() == OptionType.EARLY_TERMINATION)
                .map(o -> o.getEndDate() != null ? o.getEndDate() : o.getStartDate())
                .filter(Objects::nonNull)
                .min(LocalDate::compareTo)
                .orElse(null);

        if (maxExtension != null && (effectiveEnd == null || maxExtension.isAfter(effectiveEnd))) {
            effectiveEnd = maxExtension;
        }
        if (minTermination != null && (effectiveEnd == null || minTermination.isBefore(effectiveEnd))) {
            effectiveEnd = minTermination;
        }
        return effectiveEnd;
    }

    // =========================================================
    // CHARTS
    // =========================================================
    private DashboardResponse.Charts buildCharts(LocalDate toDate, String siteId, String buildingId) {
        Query leaseQuery = new Query();
        if (siteId != null && !siteId.isEmpty()) leaseQuery.addCriteria(Criteria.where("siteId").is(siteId));
        if (buildingId != null && !buildingId.isEmpty()) {
            leaseQuery.addCriteria(new Criteria().orOperator(
                Criteria.where("blId").is(buildingId),
                Criteria.where("buildingId").is(buildingId)
            ));
        }
        List<Lease> leases = mongoTemplate.find(leaseQuery, Lease.class);
        Set<String> validLeaseIds = leases.stream().map(Lease::getLsId).collect(Collectors.toSet());

        List<LeaseOption> options = mongoTemplate.findAll(LeaseOption.class);
        List<RecurringCostSchedule> schedules = mongoTemplate.findAll(RecurringCostSchedule.class)
            .stream().filter(s -> validLeaseIds.contains(s.getLeaseId())).collect(Collectors.toList());
        List<Clause> clauses = mongoTemplate.findAll(Clause.class)
            .stream().filter(c -> validLeaseIds.contains(c.getLeaseId())).collect(Collectors.toList());
        List<RecurringCost> recurringCosts = mongoTemplate.findAll(RecurringCost.class)
            .stream().filter(c -> validLeaseIds.contains(c.getLsId())).collect(Collectors.toList());
            
        Map<String, Lease> leaseMap = leases.stream().collect(Collectors.toMap(Lease::getLsId, l -> l, (l1, l2) -> l1));
        Map<String, RecurringCost> costMap = recurringCosts.stream().filter(c -> c.getRecurringCostId() != null).collect(Collectors.toMap(RecurringCost::getRecurringCostId, c -> c, (c1, c2) -> c1));
        
        List<Map<String, Object>> exp1MList = new ArrayList<>();
        List<Map<String, Object>> exp3MList = new ArrayList<>();
        List<Map<String, Object>> exp6MList = new ArrayList<>();
        List<Map<String, Object>> expOverdueList = new ArrayList<>();

        long exp1M = 0, exp3M = 0, exp6M = 0, expOverdue = 0;
        for (Lease ls : leases) {
            if (!Boolean.TRUE.equals(ls.getActive())) continue;
            
            List<LeaseOption> lsOps = options.stream().filter(o -> o.getLsId().equals(ls.getLsId()) && Boolean.TRUE.equals(o.getActive())).collect(Collectors.toList());
            if (lsOps.stream().anyMatch(o -> o.getOpType() == OptionType.LEASE_END)) continue; 

            LocalDate effectiveEnd = getEffectiveEndDate(ls, lsOps);

            if (effectiveEnd != null) {
                long daysLeft = ChronoUnit.DAYS.between(toDate, effectiveEnd); 
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
            
            Lease lease = leases.stream()
                .filter(ls -> ls.getLsId().equals(sch.getLeaseId()) && Boolean.TRUE.equals(ls.getActive()))
                .findFirst().orElse(null);
            if (lease == null) continue;

            List<LeaseOption> lsOps = options.stream()
                    .filter(o -> o.getLsId().equals(lease.getLsId()) && Boolean.TRUE.equals(o.getActive()))
                    .collect(Collectors.toList());

            LocalDate effectiveEnd = getEffectiveEndDate(lease, lsOps);
            if (effectiveEnd != null && effectiveEnd.isBefore(toDate)) {
                continue; // Hợp đồng đã hết hạn thực tế thì không tính nợ quá hạn
            }

            if (sch.getPaymentStatus() == PaymentStatus.PENDING || sch.getPaymentStatus() == null) { 
                long delay = ChronoUnit.DAYS.between(sch.getDueDate(), toDate); 
                if (delay > 0) {
                    Map<String, Object> detail = new HashMap<>();
                    detail.put("id", sch.getLeaseId() != null ? sch.getLeaseId() : "N/A");
                    detail.put("name", sch.getCostType() != null ? sch.getCostType().name() : "N/A");
                    detail.put("value", String.format("%,.0f VND", getSafeAmount(sch, leaseMap, costMap)));
                    detail.put("recurringCostId", sch.getRecurringCostId() != null ? sch.getRecurringCostId() : "N/A");
                    detail.put("dueDate", sch.getDueDate() != null ? sch.getDueDate().toString() : "N/A");

                    if (delay <= 270) { overdue270++; overdue270List.add(detail); }
                    else { overdueMore270++; overdueMore270List.add(detail); }
                }
            } else if (sch.getPaymentStatus() == PaymentStatus.PAID) { 
                if (sch.getPaymentDate() != null && sch.getDueDate().isBefore(sch.getPaymentDate())) {
                    Map<String, Object> detail = new HashMap<>();
                    detail.put("id", sch.getLeaseId() != null ? sch.getLeaseId() : "N/A");
                    detail.put("name", sch.getCostType() != null ? sch.getCostType().name() : "N/A");
                    detail.put("value", String.format("%,.0f VND", getSafeAmount(sch, leaseMap, costMap)));
                    detail.put("recurringCostId", sch.getRecurringCostId() != null ? sch.getRecurringCostId() : "N/A");
                    detail.put("dueDate", sch.getDueDate() != null ? sch.getDueDate().toString() : "N/A");

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
            Lease lease = leases.stream()
                .filter(ls -> ls.getLsId().equals(clause.getLeaseId()) && Boolean.TRUE.equals(ls.getActive()))
                .findFirst().orElse(null);
            if (lease == null) continue;

            List<LeaseOption> lsOps = options.stream()
                    .filter(o -> o.getLsId().equals(lease.getLsId()) && Boolean.TRUE.equals(o.getActive()))
                    .collect(Collectors.toList());

            LocalDate effectiveEnd = getEffectiveEndDate(lease, lsOps);

            if (effectiveEnd != null && effectiveEnd.isBefore(toDate)) {
                continue; // Hợp đồng đã hết hạn thực tế thì không tính
            }

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
    
    private enum RevenueCategory {
        CONTRACT, SERVICE, AMENITY, TOTAL
    }

    private DashboardResponse.RevenueMetrics buildRevenueMetrics(LocalDate fromDate, LocalDate toDate, List<Floor> floors, List<Room> rooms, List<Suite> suites, String siteId, String buildingId) {
        Query leaseQuery = new Query();
        if (siteId != null && !siteId.isEmpty()) leaseQuery.addCriteria(Criteria.where("siteId").is(siteId));
        if (buildingId != null && !buildingId.isEmpty()) {
            leaseQuery.addCriteria(new Criteria().orOperator(
                Criteria.where("blId").is(buildingId),
                Criteria.where("buildingId").is(buildingId)
            ));
        }
        List<Lease> allLeases = mongoTemplate.find(leaseQuery, Lease.class);
        Set<String> validLeaseIds = allLeases.stream().map(Lease::getLsId).collect(Collectors.toSet());

        List<LeaseAmenity> leaseAmenities = mongoTemplate.findAll(LeaseAmenity.class);
        List<RecurringCostSchedule> schedules = mongoTemplate.findAll(RecurringCostSchedule.class)
            .stream().filter(s -> s.getLeaseId() != null && validLeaseIds.contains(s.getLeaseId())).collect(Collectors.toList());

        List<LeaseOption> allOptions = mongoTemplate.findAll(LeaseOption.class);
        
        List<RecurringCost> allRecurringCosts = mongoTemplate.findAll(RecurringCost.class)
            .stream().filter(c -> c.getLsId() != null && validLeaseIds.contains(c.getLsId())).collect(Collectors.toList());
        
        Map<String, String> costTypeMap = allRecurringCosts.stream()
                .filter(c -> c.getRecurringCostId() != null && c.getCostType() != null)
                .collect(Collectors.toMap(RecurringCost::getRecurringCostId, RecurringCost::getCostType, (e1, e2) -> e1));

        Map<String, Lease> leaseMap = allLeases.stream()
                .collect(Collectors.toMap(Lease::getLsId, l -> l, (l1, l2) -> l1));
        Map<String, RecurringCost> costMap = allRecurringCosts.stream()
                .filter(c -> c.getRecurringCostId() != null)
                .collect(Collectors.toMap(RecurringCost::getRecurringCostId, c -> c, (c1, c2) -> c1));

        Query planQuery = new Query();
        if (siteId != null && !siteId.isEmpty()) planQuery.addCriteria(Criteria.where("siteId").is(siteId));
        List<org.bson.Document> allPlans = mongoTemplate.find(planQuery, org.bson.Document.class, "planned_revenues");
        
        // --- FIX: Tính NFA từ Floor records đã được lọc theo Site/Building ---
        BigDecimal safeNfa = floors.stream()
            .map(f -> f.getNfa() != null ? BigDecimal.valueOf(f.getNfa()) : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        // Fallback: nếu floor chưa có NFA (chưa upload DXF), tính từ rooms/suites
        if (safeNfa.compareTo(BigDecimal.ZERO) == 0) {
            BigDecimal roomNfa = rooms.stream()
                .map(r -> r.getArea() != null ? BigDecimal.valueOf(r.getArea()) : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal suiteNfa = suites.stream()
                .map(s -> s.getArea() != null ? BigDecimal.valueOf(s.getArea()) : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
            safeNfa = roomNfa.add(suiteNfa);
        }

        Set<String> amenityLeaseIds = leaseAmenities.stream().map(LeaseAmenity::getLsId).collect(Collectors.toSet());

        List<org.bson.Document> leaseDocs = mongoTemplate.find(leaseQuery, org.bson.Document.class, "leases");
        Map<String, org.bson.Document> leaseDocMap = new HashMap<>();
        for (org.bson.Document doc : leaseDocs) {
            String lsId = doc.getString("_id") != null ? doc.getString("_id") : doc.getString("ls_id");
            if (lsId == null) lsId = doc.getString("lsId");
            if (lsId == null) continue;
            leaseDocMap.put(lsId, doc);
            
            boolean isAmenity = Boolean.TRUE.equals(doc.getBoolean("assocAmenity")) || Boolean.TRUE.equals(doc.getBoolean("assoc_amenity"))
                    || doc.getString("amenityId") != null || doc.getString("amenity_id") != null
                    || doc.get("amenityIds") != null || doc.get("amenity_ids") != null;
            if (isAmenity) {
                amenityLeaseIds.add(lsId);
            }
        }
        
        // Nếu vẫn = 0, lấy NFA từ area_negotiated của các lease đang active
        // (emergency fallback theo đúng công thức PDF)
        if (safeNfa.compareTo(BigDecimal.ZERO) == 0) {
            safeNfa = allLeases.stream()
                .filter(l -> Boolean.TRUE.equals(l.getActive()))
                .filter(l -> !amenityLeaseIds.contains(l.getLsId()))
                .map(l -> l.getAreaNegotiated() != null 
                    ? BigDecimal.valueOf(l.getAreaNegotiated()) 
                    : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
            // Thêm hệ số ước tính NFA = tổng area_negotiated / 0.7 (NFA thường ~70% tổng)
            if (safeNfa.compareTo(BigDecimal.ZERO) > 0) {
                safeNfa = safeNfa.divide(new BigDecimal("0.7"), 2, RoundingMode.HALF_UP);
            }
        }

        int currentYear = toDate.getYear();
        int currentMonth = toDate.getMonthValue();

        DashboardResponse.KPICards contractKpi = buildKPICards(schedules, allPlans, currentYear, currentMonth, toDate, RevenueCategory.CONTRACT, amenityLeaseIds, costTypeMap, allRecurringCosts, allLeases, allOptions, safeNfa, leaseMap, costMap, leaseDocMap);
        DashboardResponse.KPICards serviceKpi = buildKPICards(schedules, allPlans, currentYear, currentMonth, toDate, RevenueCategory.SERVICE, amenityLeaseIds, costTypeMap, allRecurringCosts, allLeases, allOptions, safeNfa, leaseMap, costMap, leaseDocMap);
        DashboardResponse.KPICards amenityKpi = buildKPICards(schedules, allPlans, currentYear, currentMonth, toDate, RevenueCategory.AMENITY, amenityLeaseIds, costTypeMap, allRecurringCosts, allLeases, allOptions, safeNfa, leaseMap, costMap, leaseDocMap);

        DashboardResponse.KPICards totalKpi = buildKPICards(schedules, allPlans, currentYear, currentMonth, toDate, RevenueCategory.TOTAL, amenityLeaseIds, costTypeMap, allRecurringCosts, allLeases, allOptions, safeNfa, leaseMap, costMap, leaseDocMap);
        totalKpi.setActualOcc(contractKpi.getActualOcc());
        totalKpi.setForecastOcc(contractKpi.getForecastOcc());
        totalKpi.setOccAchievement(contractKpi.getOccAchievement());
        totalKpi.setForecastOccAchievement(contractKpi.getForecastOccAchievement());
        totalKpi.setYtdOccAchievement(contractKpi.getYtdOccAchievement());

        List<DashboardResponse.MonthlyRevenue> contractChart = buildMonthlyChart(schedules, allPlans, currentYear, toDate, RevenueCategory.CONTRACT, amenityLeaseIds, costTypeMap, allRecurringCosts, allLeases, allOptions, safeNfa, leaseMap, costMap, leaseDocMap);
        List<DashboardResponse.MonthlyRevenue> serviceChart = buildMonthlyChart(schedules, allPlans, currentYear, toDate, RevenueCategory.SERVICE, amenityLeaseIds, costTypeMap, allRecurringCosts, allLeases, allOptions, safeNfa, leaseMap, costMap, leaseDocMap);
        List<DashboardResponse.AmenityRevenueData> amenityChart = buildAmenityChartRefactored(
                schedules, allPlans, currentYear, amenityLeaseIds, costTypeMap, allLeases, allOptions, allRecurringCosts, leaseMap, costMap, leaseDocMap);

        return DashboardResponse.RevenueMetrics.builder()
                .contract(contractChart)
                .serviceFee(serviceChart)
                .amenity(amenityChart)
                .kpi(totalKpi)
                .contractKpi(contractKpi)
                .serviceFeeKpi(serviceKpi)
                .amenityKpi(amenityKpi)
                .build();
    }

    // =========================================================
    // KPI CALCULATION HELPER
    // =========================================================
    private DashboardResponse.KPICards buildKPICards(
            List<RecurringCostSchedule> schedules, List<org.bson.Document> plans,
            int year, int month, LocalDate toDate,
            RevenueCategory category, Set<String> amenityLeaseIds, Map<String, String> costTypeMap,
            List<RecurringCost> allCosts, List<Lease> leases, List<LeaseOption> options, BigDecimal safeNfa,
            Map<String, Lease> leaseMap, Map<String, RecurringCost> costMap, Map<String, org.bson.Document> leaseDocMap) {
        
        // 1. Annual Plan: SUM(plan_cost) của năm filter
        BigDecimal annualPlan = plans.stream()
            .filter(p -> getYearFromDoc(p) == year && isMatchingPlanCategory(p, category, amenityLeaseIds))
            .map(p -> getCostFromDoc(p, "plannedRevenue", "planned_revenue", "plan_revenue", "plan_cost", "plannedCost", "planCost"))
            .reduce(BigDecimal.ZERO, BigDecimal::add);
            
        // 2. Plan To Date: SUM(plan_cost) từ đầu năm đến month
        BigDecimal planToDate = plans.stream()
            .filter(p -> getYearFromDoc(p) == year && getMonthFromDoc(p) > 0 && getMonthFromDoc(p) <= month && isMatchingPlanCategory(p, category, amenityLeaseIds))
            .map(p -> getCostFromDoc(p, "plannedRevenue", "planned_revenue", "plan_revenue", "plan_cost", "plannedCost", "planCost"))
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        // 3. Actual To Date: Doanh thu thực tế (payment_status = PAID) trong khoảng thời gian đến toDate
        BigDecimal actualToDate = calculateActualToDate(schedules, year, toDate, category, amenityLeaseIds, costTypeMap, leaseMap, costMap);
        
        // 4. Annual Forecast: Bằng sum(chưa huỷ) + sum(extrapolate nếu có assume_renewal)
        BigDecimal annualForecast = calculateAnnualForecast(schedules, year, category, amenityLeaseIds, costTypeMap, allCosts, leaseMap, costMap, options);
        BigDecimal hiddenAnnualForecast = BigDecimal.ZERO;
        for (int m = 1; m <= 12; m++) {
            hiddenAnnualForecast = hiddenAnnualForecast.add(calculateHiddenForecastTotal(leases, options, schedules, allCosts, category, amenityLeaseIds, costTypeMap, year, m, leaseMap, costMap, leaseDocMap));
        }
        annualForecast = annualForecast.add(hiddenAnnualForecast);

        // 5. Achievement Calculations (bảo vệ khỏi lỗi Divide by Zero)
        double planAchievement = calculatePercentage(actualToDate, annualPlan);
        double forecastAchievement = calculatePercentage(annualForecast, annualPlan);
        double ytdAchievement = calculatePercentage(actualToDate, planToDate);

        // 6. OCC: Chỉ tính cho Contract (Loại trừ các hợp đồng Amenity)
        Double actualOcc = 0.0;
        Double forecastOcc = 0.0;
        Double occAchievement = 0.0;
        Double forecastOccAchievement = 0.0;
        Double ytdOccAchievement = 0.0;
        
        if (category == RevenueCategory.CONTRACT || category == RevenueCategory.TOTAL) {
            actualOcc = calculateActualOCC(leases, options, safeNfa, year, month, amenityLeaseIds, leaseDocMap);
            forecastOcc = calculateForecastOCC(leases, options, safeNfa, year, month, toDate, amenityLeaseIds, leaseDocMap);
            
            double sumAnnualOccPlan = 0.0;
            double sumYtdOccPlan = 0.0;
            for(int m = 1; m <= 12; m++) {
                final int cm = m;
                double occP = plans.stream()
                    .filter(p -> getYearFromDoc(p) == year && getMonthFromDoc(p) == cm && (isMatchingPlanCategory(p, RevenueCategory.CONTRACT, amenityLeaseIds) || isOccPlan(p)))
                    .mapToDouble(p -> getCostFromDoc(p, "plannedOcc", "planned_occ", "plan_occ", "occ").doubleValue())
                    .filter(v -> v > 0)
                    .findFirst().orElse(0.0);
                sumAnnualOccPlan += occP;
                if (m <= month) sumYtdOccPlan += occP;
            }
            double annualAvgPlannedOcc = sumAnnualOccPlan / 12.0;
            double ytdAvgPlannedOcc = month > 0 ? sumYtdOccPlan / (double)month : 0.0;

            double actOccVal = actualOcc != null ? actualOcc : 0.0;
            double forOccVal = forecastOcc != null ? forecastOcc : 0.0;

            occAchievement = annualAvgPlannedOcc > 0 ? formatOccPercentAllowNull((actOccVal / annualAvgPlannedOcc) * 100) : 0.0;
            forecastOccAchievement = annualAvgPlannedOcc > 0 ? formatOccPercentAllowNull((forOccVal / annualAvgPlannedOcc) * 100) : 0.0;
            ytdOccAchievement = ytdAvgPlannedOcc > 0 ? formatOccPercentAllowNull((actOccVal / ytdAvgPlannedOcc) * 100) : 0.0;
        }

        return DashboardResponse.KPICards.builder()
                .annualPlan(annualPlan).planToDate(planToDate).actualToDate(actualToDate).annualForecast(annualForecast)
                .planAchievement(planAchievement).forecastAchievement(forecastAchievement).ytdAchievement(ytdAchievement)
                .actualOcc(actualOcc).forecastOcc(forecastOcc)
                .occAchievement(occAchievement).forecastOccAchievement(forecastOccAchievement).ytdOccAchievement(ytdOccAchievement)
                .build();
    }

    private List<DashboardResponse.MonthlyRevenue> buildMonthlyChart(
            List<RecurringCostSchedule> schedules, List<org.bson.Document> plans,
            int year, LocalDate toDate,
            RevenueCategory category, Set<String> amenityLeaseIds, Map<String, String> costTypeMap,
            List<RecurringCost> allCosts, List<Lease> leases, List<LeaseOption> options, BigDecimal safeNfa,
            Map<String, Lease> leaseMap, Map<String, RecurringCost> costMap, Map<String, org.bson.Document> leaseDocMap) {
        
        List<DashboardResponse.MonthlyRevenue> monthlyData = new ArrayList<>();
        
        for (int m = 1; m <= 12; m++) {
            BigDecimal actual = calculateActualRevenue(schedules, year, m, category, amenityLeaseIds, costTypeMap, leaseMap, costMap);
            
            BigDecimal forecast = calculateForecastRevenue(schedules, year, m, category, amenityLeaseIds, costTypeMap, leaseMap, costMap, options);
            forecast = forecast.add(calculateHiddenForecastTotal(leases, options, schedules, allCosts, category, amenityLeaseIds, costTypeMap, year, m, leaseMap, costMap, leaseDocMap));
            
            final int monthFilter = m;
            BigDecimal planned = plans.stream()
                .filter(p -> getYearFromDoc(p) == year && getMonthFromDoc(p) == monthFilter && isMatchingPlanCategory(p, category, amenityLeaseIds))
                .map(p -> getCostFromDoc(p, "plannedRevenue", "planned_revenue", "plan_revenue", "plan_cost", "plannedCost", "planCost"))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

            Double plannedOcc = 0.0;
            Double actualOcc = 0.0;
            Double forecastOcc = 0.0;
            
            if (category == RevenueCategory.CONTRACT || category == RevenueCategory.TOTAL) {
                double plannedOccRaw = plans.stream()
                    .filter(p -> getYearFromDoc(p) == year && getMonthFromDoc(p) == monthFilter && (isMatchingPlanCategory(p, RevenueCategory.CONTRACT, amenityLeaseIds) || isOccPlan(p)))
                    .mapToDouble(p -> getCostFromDoc(p, "plannedOcc", "planned_occ", "plan_occ", "occ").doubleValue())
                    .filter(v -> v > 0)
                    .findFirst().orElse(0.0);
                plannedOcc = formatOccPercentAllowNull(plannedOccRaw);

                actualOcc = formatOccPercentAllowNull(calculateActualOCC(leases, options, safeNfa, year, m, amenityLeaseIds, leaseDocMap));
                forecastOcc = formatOccPercentAllowNull(calculateForecastOCC(leases, options, safeNfa, year, m, toDate, amenityLeaseIds, leaseDocMap));
            }

            monthlyData.add(DashboardResponse.MonthlyRevenue.builder()
                .month("T" + m)
                .actual(actual).planned(planned).forecast(forecast)
                .actualOcc(actualOcc).plannedOcc(plannedOcc).forecastOcc(forecastOcc)
                .build());
        }
        return monthlyData;
    }

    // =========================================================
    // CORE CALCULATIONS
    // =========================================================

    private BigDecimal calculateActualRevenue(List<RecurringCostSchedule> schedules, int year, int month, RevenueCategory category, Set<String> amenityLeaseIds, Map<String, String> costTypeMap, Map<String, Lease> leaseMap, Map<String, RecurringCost> costMap) {
        return schedules.stream()
            .filter(s -> s.getDueDate() != null && s.getDueDate().getYear() == year && s.getDueDate().getMonthValue() == month)
            .filter(s -> s.getPaymentStatus() == PaymentStatus.PAID)
            .filter(s -> isMatchingCategory(s, category, amenityLeaseIds, costTypeMap))
            .map(s -> getSafeAmount(s, leaseMap, costMap))
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal calculateActualToDate(List<RecurringCostSchedule> schedules, int year, LocalDate toDate, RevenueCategory category, Set<String> amenityLeaseIds, Map<String, String> costTypeMap, Map<String, Lease> leaseMap, Map<String, RecurringCost> costMap) {
        return schedules.stream()
            .filter(s -> s.getDueDate() != null && s.getDueDate().getYear() == year && !s.getDueDate().isAfter(toDate))
            .filter(s -> s.getPaymentStatus() == PaymentStatus.PAID)
            .filter(s -> isMatchingCategory(s, category, amenityLeaseIds, costTypeMap))
            .map(s -> getSafeAmount(s, leaseMap, costMap))
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal calculateForecastRevenue(List<RecurringCostSchedule> schedules, int year, int month, RevenueCategory category, Set<String> amenityLeaseIds, Map<String, String> costTypeMap, Map<String, Lease> leaseMap, Map<String, RecurringCost> costMap, List<LeaseOption> allOptions) {
        return schedules.stream()
            .filter(s -> s.getDueDate() != null && s.getDueDate().getYear() == year && s.getDueDate().getMonthValue() == month)
            .filter(s -> s.getPaymentStatus() != PaymentStatus.REJECTED)
            .filter(s -> {
                if (s.getRecurringCostId() == null) return true;
                RecurringCost cost = costMap.get(s.getRecurringCostId());
                return cost == null || cost.getScheduleStatus() == null || !cost.getScheduleStatus().toUpperCase().contains("CANCEL");
            })
            .filter(s -> isMatchingCategory(s, category, amenityLeaseIds, costTypeMap))
            .filter(s -> {
                Lease lease = leaseMap.get(s.getLeaseId());
                if (lease == null) return true;
                List<LeaseOption> lsOps = allOptions.stream()
                        .filter(o -> o.getLsId().equals(lease.getLsId()) && Boolean.TRUE.equals(o.getActive()))
                        .collect(Collectors.toList());
                LocalDate effectiveEnd = getEffectiveEndDate(lease, lsOps);
                if (effectiveEnd != null && s.getDueDate().isAfter(effectiveEnd)) {
                    return false;
                }
                return true;
            })
            .map(s -> getSafeAmount(s, leaseMap, costMap))
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal calculateAnnualForecast(List<RecurringCostSchedule> schedules, int year, RevenueCategory category, Set<String> amenityLeaseIds, Map<String, String> costTypeMap, List<RecurringCost> allCosts, Map<String, Lease> leaseMap, Map<String, RecurringCost> costMap, List<LeaseOption> allOptions) {
        Set<String> scheduledCostIds = allCosts.stream()
            .filter(c -> c.getScheduleStatus() != null && c.getScheduleStatus().toUpperCase().contains(STATUS_SCHEDULED))
            .map(RecurringCost::getRecurringCostId)
            .collect(Collectors.toSet());

        return schedules.stream()
            .filter(s -> s.getDueDate() != null && s.getDueDate().getYear() == year)
            .filter(s -> s.getPaymentStatus() != PaymentStatus.REJECTED)
            .filter(s -> scheduledCostIds.contains(s.getRecurringCostId())) // 🚀 FIX: Bắt buộc CPĐK phải là SCHEDULED, không được cộng dồn hàng loạt Draft Schedules
            .filter(s -> isMatchingCategory(s, category, amenityLeaseIds, costTypeMap))
            .filter(s -> {
                Lease lease = leaseMap.get(s.getLeaseId());
                if (lease == null) return true;
                List<LeaseOption> lsOps = allOptions.stream()
                        .filter(o -> o.getLsId().equals(lease.getLsId()) && Boolean.TRUE.equals(o.getActive()))
                        .collect(Collectors.toList());
                LocalDate effectiveEnd = getEffectiveEndDate(lease, lsOps);
                if (effectiveEnd != null && s.getDueDate().isAfter(effectiveEnd)) {
                    return false;
                }
                return true;
            })
            .map(s -> getSafeAmount(s, leaseMap, costMap))
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private Double calculateActualOCC(List<Lease> leases, List<LeaseOption> allOptions, BigDecimal safeNfa, int year, int month, Set<String> amenityLeaseIds, Map<String, org.bson.Document> leaseDocMap) {
        if (safeNfa == null || safeNfa.compareTo(BigDecimal.ZERO) == 0) return 0.0;

        BigDecimal occSum = leases.stream()
            .filter(l -> !amenityLeaseIds.contains(l.getLsId()))
            .filter(l -> {
                // FIX: Lọc options chỉ của lease này
                List<LeaseOption> leaseOps = allOptions.stream()
                    .filter(o -> l.getLsId() != null && l.getLsId().equals(o.getLsId())
                        && Boolean.TRUE.equals(o.getActive()))
                    .collect(Collectors.toList());
                return isLeaseActiveInMonth(l, leaseOps, year, month, leaseDocMap);
            })
            .map(l -> {
                org.bson.Document d = leaseDocMap.get(l.getLsId());
                if (d != null) {
                    Object areaObj = d.get("area_negotiated");
                    if (areaObj == null) areaObj = d.get("areaNegotiated");
                    if (areaObj != null) {
                        try { return new BigDecimal(areaObj.toString()); } catch(Exception ignored){}
                    }
                }
                return l.getAreaNegotiated() != null ? BigDecimal.valueOf(l.getAreaNegotiated()) : BigDecimal.ZERO;
            })
            .reduce(BigDecimal.ZERO, BigDecimal::add);
            
        return calculatePercentage(occSum, safeNfa);
    }

    private Double calculateForecastOCC(List<Lease> leases, List<LeaseOption> allOptions, BigDecimal safeNfa, int year, int month, LocalDate toDate, Set<String> amenityLeaseIds, Map<String, org.bson.Document> leaseDocMap) {
        if (safeNfa == null || safeNfa.compareTo(BigDecimal.ZERO) == 0) return 0.0;

        LocalDate targetDate = LocalDate.of(year, month, 1);
        LocalDate currentMonthStart = LocalDate.of(toDate.getYear(), toDate.getMonthValue(), 1);
        
        // KHÔNG hiển thị Forecast OCC cho các tháng quá khứ
        if (targetDate.isBefore(currentMonthStart)) {
            return null;
        }

        BigDecimal occSum = leases.stream()
            .filter(l -> !amenityLeaseIds.contains(l.getLsId()))
            .filter(l -> {
                // FIX: Lọc options chỉ của lease này
                List<LeaseOption> leaseOps = allOptions.stream()
                    .filter(o -> l.getLsId() != null && l.getLsId().equals(o.getLsId())
                        && Boolean.TRUE.equals(o.getActive()))
                    .collect(Collectors.toList());
                return isLeaseForecastActiveInMonth(l, leaseOps, year, month, leaseDocMap);
            })
            .map(l -> {
                org.bson.Document d = leaseDocMap.get(l.getLsId());
                if (d != null) {
                    Object areaObj = d.get("area_negotiated");
                    if (areaObj == null) areaObj = d.get("areaNegotiated");
                    if (areaObj != null) {
                        try { return new BigDecimal(areaObj.toString()); } catch(Exception ignored){}
                    }
                }
                return l.getAreaNegotiated() != null ? BigDecimal.valueOf(l.getAreaNegotiated()) : BigDecimal.ZERO;
            })
            .reduce(BigDecimal.ZERO, BigDecimal::add);
            
        return calculatePercentage(occSum, safeNfa);
    }

    // =========================================================
    // RENEWAL EXTRAPOLATION
    // =========================================================
    private BigDecimal calculateHiddenForecastTotal(
            List<Lease> leases, List<LeaseOption> options, List<RecurringCostSchedule> schedules,
            List<RecurringCost> allCosts, RevenueCategory category, Set<String> amenityLeaseIds,
            Map<String, String> costTypeMap, int year, int month,
            Map<String, Lease> leaseMap, Map<String, RecurringCost> costMap, Map<String, org.bson.Document> leaseDocMap) {
        
        BigDecimal total = BigDecimal.ZERO;
        for (Lease lease : leases) {
            if (category == RevenueCategory.CONTRACT && amenityLeaseIds.contains(lease.getLsId())) continue;
            if (category == RevenueCategory.AMENITY && !amenityLeaseIds.contains(lease.getLsId())) continue;
            
            total = total.add(calculateRenewalForecast(lease, options, schedules, allCosts, category, amenityLeaseIds, costTypeMap, year, month, leaseMap, costMap, leaseDocMap));
        }
        return total;
    }

    private BigDecimal calculateRenewalForecast(
            Lease lease, List<LeaseOption> lsOps, List<RecurringCostSchedule> allSchedules,
            List<RecurringCost> allRecurringCosts, RevenueCategory category, Set<String> amenityLeaseIds,
            Map<String, String> costTypeMap, int targetYear, int targetMonth,
            Map<String, Lease> leaseMap, Map<String, RecurringCost> costMap, Map<String, org.bson.Document> leaseDocMap) {
        
            boolean isActive = Boolean.TRUE.equals(lease.getActive());
            boolean assumeRenewal = Boolean.TRUE.equals(lease.getAssumeRenewal());
            
            org.bson.Document doc = leaseDocMap.get(lease.getLsId());
            if (doc != null) {
                if (doc.get("active") != null) isActive = doc.getBoolean("active", false);
                if (doc.get("assume_renewal") != null) assumeRenewal = doc.getBoolean("assume_renewal", false);
                if (doc.get("assumeRenewal") != null) assumeRenewal = doc.getBoolean("assumeRenewal", false);
            }

            if (!isActive) return BigDecimal.ZERO;
            if (!assumeRenewal) return BigDecimal.ZERO;

            List<LeaseOption> leaseOptions = lsOps.stream()
                    .filter(o -> o.getLsId().equals(lease.getLsId()) && Boolean.TRUE.equals(o.getActive()))
                    .collect(Collectors.toList());

            boolean hasTermination = leaseOptions.stream().anyMatch(o -> o.getOpType() == OptionType.LEASE_END || o.getOpType() == OptionType.EARLY_TERMINATION);
            if (hasTermination) return BigDecimal.ZERO;

            LocalDate effectiveEnd = getEffectiveEndDate(lease, leaseOptions);
            LocalDate targetStart = LocalDate.of(targetYear, targetMonth, 1);
            LocalDate targetEnd = targetStart.withDayOfMonth(targetStart.lengthOfMonth());
            
            // Tôn trọng thao tác huỷ: Nếu user đã explicitly cancel schedule tháng này, KHÔNG tự động extrapolate đè lên
            boolean hasScheduleInTargetMonth = allSchedules.stream()
                .anyMatch(s -> s.getLeaseId() != null && s.getLeaseId().equals(lease.getLsId()) 
                    && isMatchingCategory(s, category, amenityLeaseIds, costTypeMap) 
                    && s.getDueDate() != null 
                    && s.getDueDate().getYear() == targetYear 
                    && s.getDueDate().getMonthValue() == targetMonth
                    && s.getPaymentStatus() != PaymentStatus.REJECTED);

            if (hasScheduleInTargetMonth) return BigDecimal.ZERO;

            BigDecimal hiddenTotal = BigDecimal.ZERO;
            
            if (effectiveEnd != null && effectiveEnd.isBefore(targetEnd)) {
                List<RecurringCost> leaseCosts = allRecurringCosts.stream()
                        .filter(c -> c.getLsId().equals(lease.getLsId()) && Boolean.TRUE.equals(c.getActive()))
                        .filter(c -> {
                            String cType = c.getCostType() != null ? c.getCostType() : "";
                            String cUpper = cType.toUpperCase().replace("_", "");
                            boolean isRent = cUpper.contains(KEY_RENT) || cUpper.contains("BASERENT");
                            boolean isService = cUpper.equals("BASESERVICE");
                            
                            if (category == RevenueCategory.CONTRACT) return isRent && !amenityLeaseIds.contains(c.getLsId());
                            if (category == RevenueCategory.SERVICE) return isService;
                            if (category == RevenueCategory.AMENITY) return !isService && amenityLeaseIds.contains(c.getLsId());
                            if (category == RevenueCategory.TOTAL) return (isRent && !amenityLeaseIds.contains(c.getLsId())) || isService || amenityLeaseIds.contains(c.getLsId());
                            return false;
                        })
                        .collect(Collectors.toList());
                
                for (RecurringCost cost : leaseCosts) {
                    RecurringCostSchedule lastSchedule = allSchedules.stream()
                            .filter(s -> s.getRecurringCostId() != null && s.getRecurringCostId().equals(cost.getRecurringCostId()) && s.getPaymentStatus() != PaymentStatus.REJECTED)
                            .max(Comparator.comparing(RecurringCostSchedule::getDueDate, Comparator.nullsFirst(Comparator.naturalOrder())))
                            .orElse(null);
                    
                    if (lastSchedule != null && lastSchedule.getDueDate() != null) {
                        LocalDate lastDue = lastSchedule.getDueDate();
                        int interval = (cost.getInterval() != null && cost.getInterval() > 0) ? cost.getInterval() : 1;
                        Period period = cost.getPeriod();
                        
                        LocalDate nextDue = lastDue;
                        int safetyCounter = 0;
                        while (nextDue != null && nextDue.isBefore(targetEnd.plusMonths(1)) && safetyCounter < 1200) {
                            safetyCounter++;
                            if (nextDue.getYear() == targetYear && nextDue.getMonthValue() == targetMonth && nextDue.isAfter(effectiveEnd)) {
                                hiddenTotal = hiddenTotal.add(getSafeAmount(lastSchedule, leaseMap, costMap));
                            }
                            
                            if (period == Period.MONTHLY) nextDue = nextDue.plusMonths(interval);
                            else if (period == Period.QUARTERLY) nextDue = nextDue.plusMonths(interval * 3L);
                            else if (period == Period.YEARLY) nextDue = nextDue.plusYears(interval);
                            else if (period == Period.WEEKLY) nextDue = nextDue.plusWeeks(interval);
                            else if (period == Period.DAILY) nextDue = nextDue.plusDays(interval);
                            else break;
                        }
                    }
                }
            }
            return hiddenTotal;
    }

    private List<DashboardResponse.AmenityRevenueData> buildAmenityChartRefactored(
            List<RecurringCostSchedule> schedules, List<org.bson.Document> plans, int year, 
            Set<String> amenityLeaseIds, Map<String, String> costTypeMap, 
            List<Lease> leases, List<LeaseOption> options, List<RecurringCost> allCosts,
            Map<String, Lease> leaseMap, Map<String, RecurringCost> costMap, Map<String, org.bson.Document> leaseDocMap) {
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

        List<org.bson.Document> leaseDocs = mongoTemplate.findAll(org.bson.Document.class, "leases");
        for (org.bson.Document doc : leaseDocs) {
            String lsId = doc.getString("_id") != null ? doc.getString("_id") : doc.getString("ls_id");
            if (lsId == null) continue;
            
            String amId = doc.getString("amenity_id") != null ? doc.getString("amenity_id") : doc.getString("amenityId");
            if (amId != null) {
                AmenityType type = amenityTypeMap.get(amId);
                if (type != null && !leaseToAmenityTypes.getOrDefault(lsId, Collections.emptyList()).contains(type)) {
                    leaseToAmenityTypes.computeIfAbsent(lsId, k -> new ArrayList<>()).add(type);
                }
            }
            
            List<?> amIds = doc.get("amenity_ids", List.class) != null ? doc.get("amenity_ids", List.class) : doc.get("amenityIds", List.class);
            if (amIds != null) {
                for (Object idObj : amIds) {
                    if (idObj instanceof String) {
                        AmenityType type = amenityTypeMap.get((String) idObj);
                        if (type != null && !leaseToAmenityTypes.getOrDefault(lsId, Collections.emptyList()).contains(type)) {
                            leaseToAmenityTypes.computeIfAbsent(lsId, k -> new ArrayList<>()).add(type);
                        }
                    }
                }
            }
        }

        String[] categories = {"Parking Area", "Billboard", "Pool", "Event Hall", "Other"};
        Map<String, BigDecimal> actualMap = new HashMap<>();
        Map<String, BigDecimal> plannedMap = new HashMap<>();
        Map<String, BigDecimal> forecastMap = new HashMap<>();
        for (String cat : categories) {
            actualMap.put(cat, BigDecimal.ZERO);
            plannedMap.put(cat, BigDecimal.ZERO);
            forecastMap.put(cat, BigDecimal.ZERO);
        }

        java.util.function.Function<AmenityType, String> mapTypeToStr = (type) -> {
            if (type == AmenityType.PARKING_AREA) return "Parking Area";
            if (type == AmenityType.BILLBOARD) return "Billboard";
            if (type == AmenityType.POOL) return "Pool";
            if (type == AmenityType.EVENT_HALL) return "Event Hall";
            return "Other";
        };

        for (int m = 1; m <= 12; m++) {
            final int month = m;
            schedules.stream()
                .filter(s -> s.getDueDate() != null && s.getDueDate().getYear() == year && s.getDueDate().getMonthValue() == month)
                .filter(s -> s.getPaymentStatus() == PaymentStatus.PAID)
                .filter(s -> isMatchingCategory(s, RevenueCategory.AMENITY, amenityLeaseIds, costTypeMap))
                .forEach(s -> {
                    BigDecimal amount = getSafeAmount(s, leaseMap, costMap);
                    List<AmenityType> types = leaseToAmenityTypes.get(s.getLeaseId());
                    if (types != null && !types.isEmpty()) {
                        BigDecimal splitAmount = amount.divide(new BigDecimal(types.size()), 2, RoundingMode.HALF_UP);
                        for (AmenityType type : types) {
                            String cat = mapTypeToStr.apply(type);
                            actualMap.put(cat, actualMap.get(cat).add(splitAmount));
                        }
                    } else {
                        actualMap.put("Other", actualMap.get("Other").add(amount));
                    }
                });

            schedules.stream()
                .filter(s -> s.getDueDate() != null && s.getDueDate().getYear() == year && s.getDueDate().getMonthValue() == month)
                .filter(s -> {
                    if (s.getRecurringCostId() == null) return true;
                    RecurringCost cost = costMap.get(s.getRecurringCostId());
                    return cost == null || cost.getScheduleStatus() == null || !cost.getScheduleStatus().toUpperCase().contains("CANCEL");
                })
                .filter(s -> isMatchingCategory(s, RevenueCategory.AMENITY, amenityLeaseIds, costTypeMap))
                .forEach(s -> {
                    BigDecimal amount = getSafeAmount(s, leaseMap, costMap);
                    List<AmenityType> types = leaseToAmenityTypes.get(s.getLeaseId());
                    if (types != null && !types.isEmpty()) {
                        BigDecimal splitAmount = amount.divide(new BigDecimal(types.size()), 2, RoundingMode.HALF_UP);
                        for (AmenityType type : types) {
                            String cat = mapTypeToStr.apply(type);
                            forecastMap.put(cat, forecastMap.get(cat).add(splitAmount));
                        }
                    } else {
                        forecastMap.put("Other", forecastMap.get("Other").add(amount));
                    }
                });
                
            for (Lease lease : leases) {
                if (!amenityLeaseIds.contains(lease.getLsId())) continue;
                BigDecimal hiddenTotal = calculateRenewalForecast(lease, options, schedules, allCosts, RevenueCategory.AMENITY, amenityLeaseIds, costTypeMap, year, month, leaseMap, costMap, leaseDocMap);
                if (hiddenTotal.compareTo(BigDecimal.ZERO) > 0) {
                    List<AmenityType> types = leaseToAmenityTypes.get(lease.getLsId());
                    if (types != null && !types.isEmpty()) {
                        BigDecimal splitAmount = hiddenTotal.divide(new BigDecimal(types.size()), 2, RoundingMode.HALF_UP);
                        for (AmenityType type : types) {
                            String cat = mapTypeToStr.apply(type);
                            forecastMap.put(cat, forecastMap.get(cat).add(splitAmount));
                        }
                    } else {
                        forecastMap.put("Other", forecastMap.get("Other").add(hiddenTotal));
                    }
                }
            }
        }

        for (org.bson.Document p : plans) {
            if (getYearFromDoc(p) == year && isMatchingPlanCategory(p, RevenueCategory.AMENITY, amenityLeaseIds)) {
                BigDecimal cost = getCostFromDoc(p, "plannedRevenue", "planned_revenue", "plan_revenue", "plan_cost", "plannedCost", "planCost");
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
                .category(cat).actual(actualMap.get(cat)).planned(plannedMap.get(cat)).forecast(forecastMap.get(cat)).build());
        }
        return list;
    }

    // =========================================================
    // UTILITIES
    // =========================================================

    private boolean isMatchingCategory(RecurringCostSchedule s, RevenueCategory cat, Set<String> amenityLeaseIds, Map<String, String> costTypeMap) {
        String cType = costTypeMap.get(s.getRecurringCostId());
        if (cType == null && s.getCostType() != null) cType = s.getCostType().name();
        if (cType == null) return false;
        
        String cUpper = cType.toUpperCase().replace("_", "");
        boolean isRent = cUpper.contains(KEY_RENT) || cUpper.contains("BASERENT");
        boolean isService = cUpper.equals("BASESERVICE");
        
        if (cat == RevenueCategory.CONTRACT) {
            return isRent && !amenityLeaseIds.contains(s.getLeaseId());
        } else if (cat == RevenueCategory.SERVICE) {
            return isService;
        } else if (cat == RevenueCategory.AMENITY) {
            return !isService && amenityLeaseIds.contains(s.getLeaseId());
        } else if (cat == RevenueCategory.TOTAL) {
            return (isRent && !amenityLeaseIds.contains(s.getLeaseId())) || isService || amenityLeaseIds.contains(s.getLeaseId());
        }
        return false;
    }

    private boolean isMatchingPlanCategory(org.bson.Document p, RevenueCategory category, Set<String> amenityLeaseIds) {
        String catStr = p.getString("category");
        if (catStr == null) return false;
        
        String cUpper = catStr.toUpperCase().replace(" ", "").replace("_", "");
        boolean isRent = cUpper.contains(KEY_RENT) || cUpper.contains("BASERENT") || cUpper.contains("RENTAL") || cUpper.equals("OCC") || cUpper.contains("OCCUPANCY");
        boolean isService = cUpper.equals("BASESERVICE") || cUpper.contains("INCOMEBASESERVICE") || cUpper.equals("SERVICE");
        
        if (category == RevenueCategory.CONTRACT) {
            return isRent;
        } else if (category == RevenueCategory.SERVICE) {
            return isService;
        } else if (category == RevenueCategory.AMENITY) {
            if (isService || isRent) return false;
            String[] amenityCats = {"PARKING", "BILLBOARD", "POOL", "EVENT", "OTHER"};
            for (String a : amenityCats) {
                if (cUpper.contains(a)) return true;
            }
            return false;
        } else if (category == RevenueCategory.TOTAL) {
            boolean isAm = false;
            String[] amenityCats = {"PARKING", "BILLBOARD", "POOL", "EVENT", "OTHER"};
            for (String a : amenityCats) { if (cUpper.contains(a)) isAm = true; }
            return isRent || isService || isAm;
        }
        return false;
    }

    private boolean isOccPlan(org.bson.Document p) {
        String catStr = p.getString("category");
        if (catStr == null) return false;
        String cUpper = catStr.toUpperCase().replace(" ", "").replace("_", "");
        return cUpper.equals("OCC") || cUpper.contains("OCCUPANCY");
    }

    private boolean isLeaseActiveInMonth(Lease lease, List<LeaseOption> lsOps, int year, int month, Map<String, org.bson.Document> docMap) {
        boolean isActive = Boolean.TRUE.equals(lease.getActive());
        if (docMap != null && docMap.containsKey(lease.getLsId())) {
            org.bson.Document doc = docMap.get(lease.getLsId());
            if (doc.get("active") != null) isActive = doc.getBoolean("active", false);
        }
        if (!isActive) return false;
        
        LocalDate startOfMonth = LocalDate.of(year, month, 1);
        LocalDate endOfMonth = startOfMonth.withDayOfMonth(startOfMonth.lengthOfMonth());
        
        if (lease.getStartDate() == null || lease.getStartDate().isAfter(endOfMonth)) return false;
        
        LocalDate effectiveEnd = getEffectiveEndDate(lease, lsOps);
        if (effectiveEnd != null && effectiveEnd.isBefore(startOfMonth)) return false;
        return true;
    }

    private boolean isLeaseForecastActiveInMonth(Lease lease, List<LeaseOption> lsOps, int year, int month, Map<String, org.bson.Document> docMap) {
        boolean isActive = Boolean.TRUE.equals(lease.getActive());
        boolean assumeRenewal = Boolean.TRUE.equals(lease.getAssumeRenewal());
        
        if (docMap != null && docMap.containsKey(lease.getLsId())) {
            org.bson.Document doc = docMap.get(lease.getLsId());
            if (doc.get("active") != null) isActive = doc.getBoolean("active", false);
            if (doc.get("assume_renewal") != null) assumeRenewal = doc.getBoolean("assume_renewal", false);
            if (doc.get("assumeRenewal") != null) assumeRenewal = doc.getBoolean("assumeRenewal", false);
        }

        // Logic cho OCC: Chỉ tính khi lease đang active (bỏ qua những hợp đồng chưa ký hoặc bản nháp)
        if (!isActive) return false;
        
        LocalDate startOfMonth = LocalDate.of(year, month, 1);
        LocalDate endOfMonth = startOfMonth.withDayOfMonth(startOfMonth.lengthOfMonth());
        
        if (lease.getStartDate() == null || lease.getStartDate().isAfter(endOfMonth)) return false;
        
        LocalDate effectiveEnd = getEffectiveEndDate(lease, lsOps);
        if (effectiveEnd != null && effectiveEnd.isBefore(startOfMonth)) {
            if (assumeRenewal) {
                boolean hasTermination = lsOps.stream().anyMatch(o -> o.getOpType() == OptionType.LEASE_END || o.getOpType() == OptionType.EARLY_TERMINATION);
                if (!hasTermination) {
                    return true;
                }
            }
            return false;
        }
        return true;
    }

    private double calculatePercentage(BigDecimal part, BigDecimal total) {
        if (total == null || total.compareTo(BigDecimal.ZERO) == 0) return 0.0;
        return part.divide(total, 4, RoundingMode.HALF_UP).multiply(new BigDecimal("100")).doubleValue();
    }

    private BigDecimal getSafeAmount(RecurringCostSchedule s, Map<String, Lease> leaseMap, Map<String, RecurringCost> costMap) {
        BigDecimal amount = BigDecimal.ZERO;
        if (s.getAmountInBase() != null && s.getAmountInBase().compareTo(BigDecimal.ZERO) > 0) {
            amount = s.getAmountInBase();
        } else if (s.getAmountInTotal() != null) {
            amount = s.getAmountInTotal();
        }

        if (amount.compareTo(BigDecimal.ZERO) > 0 && s.getRecurringCostId() != null) {
            RecurringCost cost = costMap.get(s.getRecurringCostId());
            Lease lease = s.getLeaseId() != null ? leaseMap.get(s.getLeaseId()) : null;
            
            BigDecimal exchangeRate = BigDecimal.ONE;
            if (cost != null) {
                if (Boolean.TRUE.equals(cost.getOverrideExchangeRate()) && cost.getExchangeRate() != null && cost.getExchangeRate().compareTo(BigDecimal.ZERO) > 0) {
                    exchangeRate = cost.getExchangeRate();
                } else if (lease != null && lease.getBaseExchangeRate() != null && lease.getBaseExchangeRate().compareTo(BigDecimal.ZERO) > 0) {
                    exchangeRate = lease.getBaseExchangeRate();
                }
            } else if (lease != null && lease.getBaseExchangeRate() != null && lease.getBaseExchangeRate().compareTo(BigDecimal.ZERO) > 0) {
                exchangeRate = lease.getBaseExchangeRate();
            }

            // BẢO VỆ DOUBLE-CONVERSION: Tránh nhân đúp tỷ giá khi người dùng vô tình nhập tiền VND nhưng vẫn gắn tỷ giá lớn
            boolean isAlreadyVND = amount.compareTo(new BigDecimal("100000")) >= 0 && exchangeRate.compareTo(new BigDecimal("10000")) >= 0;
            if (exchangeRate.compareTo(BigDecimal.ONE) > 0 && !isAlreadyVND) {
                amount = amount.multiply(exchangeRate);
            }
        }
        return amount;
    }

    private int getYearFromDoc(org.bson.Document p) {
        if (p.get("year") != null) {
            try { return (int) Double.parseDouble(p.get("year").toString()); } catch (Exception e) {}
        }
        return -1;
    }

    private int getMonthFromDoc(org.bson.Document p) {
        if (p.get("month") != null) {
            try { return (int) Double.parseDouble(p.get("month").toString()); } catch (Exception e) {}
        }
        return -1;
    }

    private BigDecimal getCostFromDoc(org.bson.Document p, String... keys) {
        for (String k : keys) {
            Object val = p.get(k);
            if (val != null) {
                try {
                    return new BigDecimal(val.toString());
                } catch (Exception e) {}
            }
        }
        return BigDecimal.ZERO;
    }

    private Double formatOccPercentAllowNull(Double value) {
        if (value == null) return null;
        if (Double.isNaN(value) || Double.isInfinite(value)) return 0.0;
        return BigDecimal.valueOf(value).setScale(2, RoundingMode.HALF_UP).doubleValue();
    }
}