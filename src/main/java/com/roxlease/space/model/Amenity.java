
package com.roxlease.space.model;

import com.roxlease.space.model.Enum.AmenityType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "amenities")
public class Amenity {
    @Id
    private String amenityId;

    @Field("amenity_name")
    private String amenityName;

    @Field("bl_id")
    private String blId;

    @Field("amenity_type")
    private AmenityType amenityType;
}
