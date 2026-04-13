package com.roxlease.cost.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "vat_countries")
public class VatCountry {
    @Id
    private String id;
    
    private String vatCountryId;
    private String countryName;
    private Double vatPercent;
    
}