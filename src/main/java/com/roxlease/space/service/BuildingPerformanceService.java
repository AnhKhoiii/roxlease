package com.roxlease.space.service;

import com.roxlease.space.dto.PerformanceResponse;
import com.roxlease.space.model.Building;
import com.roxlease.space.model.Floor;
import com.roxlease.space.model.Room;
import com.roxlease.space.model.Suite;
import com.roxlease.lease.model.LeaseSuite;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class BuildingPerformanceService {

    @Autowired
    private MongoTemplate mongoTemplate;

    public PerformanceResponse getPerformanceMetrics(String siteId, String blId) { // <-- Đổi tham số
        boolean isSiteAll = siteId == null || "ALL".equalsIgnoreCase(siteId);
        boolean isBuildingAll = blId == null || "ALL".equalsIgnoreCase(blId);

        // 1. Fetch Buildings
        Query bldQuery = new Query();
        if (!isSiteAll) bldQuery.addCriteria(Criteria.where("siteId").is(siteId));
        if (!isBuildingAll) bldQuery.addCriteria(Criteria.where("blId").is(blId)); // <-- Query theo blId
        
        List<Building> buildings = mongoTemplate.find(bldQuery, Building.class);
        
        // Map Building theo blId
        Map<String, Building> buildingMap = buildings.stream().collect(Collectors.toMap(Building::getBlId, b -> b, (existing, replacement) -> existing));
        List<String> targetBuildingIds = new ArrayList<>(buildingMap.keySet());

        // 2. Fetch Floors
        List<Floor> floors = targetBuildingIds.isEmpty() ? Collections.emptyList() :
                mongoTemplate.find(new Query(Criteria.where("blId").in(targetBuildingIds)), Floor.class); // <-- Query theo blId
        
        Map<String, String> floorToBuildingMap = new HashMap<>();
        Map<String, String> floorToSiteMap = new HashMap<>();
        List<String> targetFloorIds = new ArrayList<>();
        
        for (Floor f : floors) {
            String fId = f.getFlId(); // <-- Lấy flId
            targetFloorIds.add(fId);
            floorToBuildingMap.put(fId, f.getBlId());
            if (buildingMap.containsKey(f.getBlId())) {
                floorToSiteMap.put(fId, buildingMap.get(f.getBlId()).getSiteId());
            }
        }

        // 3. Fetch Suites & Rooms
        List<Suite> suites = targetFloorIds.isEmpty() ? Collections.emptyList() :
                mongoTemplate.find(new Query(Criteria.where("flId").in(targetFloorIds)), Suite.class); // <-- Query theo flId
        
        List<Room> rooms = targetFloorIds.isEmpty() ? Collections.emptyList() :
                mongoTemplate.find(new Query(Criteria.where("flId").in(targetFloorIds)), Room.class); // <-- Query theo flId

        // 4. Fetch Active Leases
        List<String> suiteIds = suites.stream().map(Suite::getSuiteId).collect(Collectors.toList());
        List<LeaseSuite> activeLeaseSuites = suiteIds.isEmpty() ? Collections.emptyList() :
                mongoTemplate.find(new Query(Criteria.where("suId").in(suiteIds).and("active").is(true)), LeaseSuite.class);
        Set<String> leasedSuiteIds = activeLeaseSuites.stream().map(LeaseSuite::getSuId).collect(Collectors.toSet());

        // 5. Calculate Metrics
        double rentableArea = suites.stream().mapToDouble(s -> s.getArea() != null ? s.getArea() : 0).sum();
        double usableArea = rooms.stream().mapToDouble(r -> r.getArea() != null ? r.getArea() : 0).sum();
        double leasedArea = suites.stream().filter(s -> leasedSuiteIds.contains(s.getSuiteId())).mapToDouble(s -> s.getArea() != null ? s.getArea() : 0).sum();

        Double uToR = rentableArea > 0 ? (usableArea / rentableArea) : 0.0;
        Double rToU = usableArea > 0 ? (rentableArea / usableArea) : 0.0;
        Double occRate = rentableArea > 0 ? (leasedArea / rentableArea) * 100 : 0.0;

        Double totalInt = null, totalExt = null;
        if (!isSiteAll && !isBuildingAll && !buildings.isEmpty()) {
            Building b = buildings.get(0);
            totalInt = b.getAreaGrossInt();
            totalExt = b.getAreaGrossExt();
        }

        // 6. Build Results
        Map<String, PerformanceResponse.ChartDataDTO> chartMap = new HashMap<>();
        List<PerformanceResponse.SuiteDetailDTO> suiteDTOs = new ArrayList<>();

        for (Suite s : suites) {
            String bId = floorToBuildingMap.getOrDefault(s.getFlId(), "Unknown");
            String sId = floorToSiteMap.getOrDefault(s.getFlId(), "Unknown");
            boolean isLeased = leasedSuiteIds.contains(s.getSuiteId());
            
            // Chart Data
            chartMap.putIfAbsent(bId, PerformanceResponse.ChartDataDTO.builder().blId(bId).usableArea(0.0).rentableArea(0.0).leasedArea(0.0).build());
            PerformanceResponse.ChartDataDTO chart = chartMap.get(bId);
            chart.setRentableArea(chart.getRentableArea() + (s.getArea() != null ? s.getArea() : 0));
            if (isLeased) chart.setLeasedArea(chart.getLeasedArea() + (s.getArea() != null ? s.getArea() : 0));

            // Table Data
            suiteDTOs.add(PerformanceResponse.SuiteDetailDTO.builder()
                    .siteId(sId).blId(bId).flId(s.getFlId()).suiteId(s.getSuiteId())
                    .suiteCode(s.getSuiteCode()).area(s.getArea()).isLeased(isLeased).build());
        }

        for (Room r : rooms) {
            String bId = floorToBuildingMap.getOrDefault(r.getFlId(), "Unknown");
            if (chartMap.containsKey(bId)) {
                chartMap.get(bId).setUsableArea(chartMap.get(bId).getUsableArea() + (r.getArea() != null ? r.getArea() : 0));
            }
        }

        return PerformanceResponse.builder()
                .kpis(PerformanceResponse.KpiDTO.builder()
                        .usableArea(usableArea).rentableArea(rentableArea).leasedArea(leasedArea)
                        .usableToRentableRatio(uToR).rentableToUsableRatio(rToU).occupancyRate(occRate)
                        .totalInteriorArea(totalInt).totalExteriorArea(totalExt).build())
                .chartData(new ArrayList<>(chartMap.values()))
                .suites(suiteDTOs).build();
    }
}