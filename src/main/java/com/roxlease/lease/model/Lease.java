package com.roxlease.lease.model;

import com.roxlease.lease.model.Enum.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "leases")
public class Lease {
    
    @Id
    private String lsId;

    private String description;

    @Field("signed_date")
    private LocalDate signedDate;

    @Field("handover_date")
    private LocalDate handoverDate;

    @Field("start_date")
    private LocalDate startDate;

    @Field("end_date")
    private LocalDate endDate;

    @Field("ls_type")
    private LeaseType lsType;

    @Field("rent_type")
    private RentType rentType;

    @Field("space_use")
    private SpaceUse spaceUse;

    private String currency;

    @Field("vat_excluded")
    private Boolean vatExcluded;

    @Field("is_sign")
    private Boolean isSign;

    @Indexed
    @Field("party_id")
    private String partyId;

    @Field("is_landlord")
    private Boolean isLandlord;
    
    @Field("landlord_tenant")
    private LandlordTenant landlordTenant;

    @Field("lease_sublease")
    private LeaseSublease leaseSublease;

    @Indexed 
    @Field("parent_ls_id")
    private String parentLsId;

    @Field("site_id")
    private String siteId;

    @Field("building_id")
    private String buildingId;

    @Field("floor_id")
    private String floorId;

    @Field("suite_id")
    private String suiteId;

    private String pic; 

    // --- DỮ LIỆU TÀI CHÍNH ---
    @Field("amount_deposit")
    private BigDecimal amountDeposit;

    @Field("rent_unit_cost")
    private BigDecimal rentUnitCost;

    @Field("service_unit_cost")
    private BigDecimal serviceUnitCost;

    @Field("base_exchange_rate")
    private BigDecimal baseExchangeRate;

    // --- DIỆN TÍCH ---
    @Field("area_negotiated")
    private Double areaNegotiated;

    @Field("area_corridor")
    private Double areaCorridor;

    @Indexed
    @Field("amenity_id")
    private String amenityId;

    @Field("assume_renewal")
    private Boolean assumeRenewal;

    @Field("index_cost")
    private Boolean indexCost;

    @Field("doc")
    private String docUrl; 

    private Boolean active;

    // --- THỜI GIAN LOGGING ---
    @CreatedDate
    @Field("created_at")
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Field("updated_at")
    private LocalDateTime updatedAt;
}