package com.roxlease.space.dto;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class PerformanceResponse {
    private KpiDTO kpis;
    private List<ChartDataDTO> chartData;
    private List<SuiteDetailDTO> suites;

    @Data
    @Builder
    public static class KpiDTO {
        private Double usableToRentableRatio;
        private Double rentableToUsableRatio;
        private Double usableArea;
        private Double rentableArea;
        private Double totalInteriorArea;
        private Double totalExteriorArea;
        private Double leasedArea;
        private Double occupancyRate;
    }

    @Data
    @Builder
    public static class ChartDataDTO {
        private String blId;        
        private Double usableArea;
        private Double rentableArea;
        private Double leasedArea;
    }

    @Data
    @Builder
    public static class SuiteDetailDTO {
        private String siteId;
        private String blId;         
        private String flId;         
        private String suiteId;
        private String suiteCode;
        private Double area;
        private Boolean isLeased;
    }
}