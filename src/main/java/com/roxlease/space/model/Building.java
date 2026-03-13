package com.roxlease.space.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "buildings")
public class Building {
    @Id
    private String blId;

    @Field("bl_name")
    private String blName;

    @Field("site_id")
    private String siteId;

    private Double lat;

    @Field("long")
    private Double longitude;

    @Field("description") 
    private String description;

    @Field("bl_image")
    private String blImage;

    @Field("date_built")
    private LocalDate dateBuilt;

    @Field("area_gross_ext")
    private Double areaGrossExt;

    @Field("area_gross_int")
    private Double areaGrossInt;

    @Field("bl_contact")
    private String blContact;

    @Field("bl_phone")
    private String blPhone;

    @Field("bl_email")
    private String blEmail;
}
