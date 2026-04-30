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
@Document(collection = "floors")
public class Floor {
    @Id
    private String flId;

    @Field("fl_name")
    private String flName;

    @Field("bl_id")
    private String blId;

    private Double nfa;
    private Double gfa;

    @Field("drawing_dwg")
    private String drawingDwg;

    @Field("drawing_json")
    private Map<String, Object> drawingJson; 

    @Field("drawing_svg")
    private String drawingSvg; 
}
