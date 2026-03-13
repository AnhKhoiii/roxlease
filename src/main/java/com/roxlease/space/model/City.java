package com.roxlease.space.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "cities")
public class City {
    @Id
    private String cityId;

    @Field("city_name")
    private String cityName;

    @Field("country_id")
    private String countryId;
}
