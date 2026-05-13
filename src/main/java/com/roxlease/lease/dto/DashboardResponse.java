package com.roxlease.lease.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Data
@Builder
public class DashboardResponse {
    private Overview overview;
    private AmenityMetrics amenity;
    private LeaseAlerts leaseAlerts;
    private Charts charts;
    private RevenueMetrics revenue;

    @Data @Builder public static class Overview {
        private long totalSites;
        private BigDecimal gfa;
        private BigDecimal nfa;
        private BigDecimal leasedNfa;
        private BigDecimal availableNfa;
        private BigDecimal otherArea;
    }

    @Data @Builder public static class AmenityMetrics {
        private long totalAmenities;
        private long leasedAmenities;
        private long availableAmenities;
    }

    @Data @Builder public static class LeaseAlerts {
        private long totalLeases;
        private long newLeases;
        private long leaseEnd;
        private long extended;
    }

    @Data @Builder public static class Charts {
        private List<ChartData> priceAdjustment;
        private List<ChartData> contractExpiration;
        private List<ChartData> overduePayment;
    }

    @Data @Builder public static class ChartData {
        private String name;
        private Number value;
        private List<Map<String, Object>> details;
    }

    @Data @Builder public static class RevenueMetrics {
        private List<MonthlyRevenue> contract;    
        private List<MonthlyRevenue> serviceFee;   
        private List<AmenityRevenueData> amenity;  
        private KPICards kpi;
        private KPICards contractKpi;
        private KPICards serviceFeeKpi;
        private KPICards amenityKpi;
    }

    @Data @Builder public static class MonthlyRevenue {
        private String month;
        private BigDecimal actual;
        private BigDecimal planned;
        private BigDecimal forecast;
        private Double actualOcc;
        private Double plannedOcc;
        private Double forecastOcc;
    }

    @Data @Builder public static class AmenityRevenueData {
        private String category;
        private BigDecimal actual;
        private BigDecimal planned;
        private BigDecimal forecast;
    }

    @Data @Builder public static class KPICards {
        private BigDecimal annualPlan;
        private BigDecimal planToDate;
        private BigDecimal actualToDate;
        private BigDecimal annualForecast;
        private double planAchievement;
        private double forecastAchievement;
        private double ytdAchievement;
        private Double actualOcc;
        private Double forecastOcc;
        private Double occAchievement;
        private Double forecastOccAchievement;
        private Double ytdOccAchievement;
    }
}