package com.roxlease.space.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "suites")
public class Suite {
    @Id
    private String suiteId;

    @Field("cad_object_id")
    private String cadObjectId;

    @Field("fl_id")
    private String flId;

    @Field("suite_code")
    private String suiteCode;

    @Field("geometry")
    private Map<String, Object> geometry;

    private Double area;

    
}