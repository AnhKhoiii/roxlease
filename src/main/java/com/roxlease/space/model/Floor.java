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

    private Double nfa; // Net Floor Area
    private Double gfa; // Gross Floor Area

    @Field("drawing_dwg")
    private String drawingDwg;

    @Field("drawing_json")
    private Map<String, Object> drawingJson; // Dữ liệu JSON lưu dạng Map

    @Field("drawing_svg")
    private String drawingSvg; // Lưu chuỗi text SVG dài
}
