package com.roxlease.space.model;

import com.roxlease.space.model.Enum.Division;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "sites")
public class Site {
    @Id
    private String siteId;

    @Field("city_id")
    private String cityId;

    @Field("site_name")
    private String siteName;

    @Field("site_contact")
    private String siteContact;

    @Field("site_phone")
    private String sitePhone;

    @Field("site_email")
    private String siteEmail;

    @Field("address")
    private String address;

    @Field("site_image")
    private String siteImage;

    private Double lat;
    
    @Field("long") 
    private Double longitude;

    private Division division;
}
