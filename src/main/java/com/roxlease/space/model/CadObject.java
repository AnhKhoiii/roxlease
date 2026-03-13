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
@Document(collection = "cad_objects")
public class CadObject {
    @Id
    private Integer cadObjectId; // Chú ý: ERD để kiểu integer

    @Field("drawing_id")
    private String drawingId;

    @Field("layer_id")
    private String layerId;

    private String handle;

    @Field("entity_type")
    private String entityType;

    @Field("object_index")
    private String objectIndex;

    @Field("geometry_json")
    private Map<String, Object> geometryJson; // Lưu tọa độ vẽ polygon

    @Field("bbox_min_x")
    private Double bboxMinX;

    @Field("bbox_min_y")
    private Double bboxMinY;

    @Field("bbox_max_x")
    private Double bboxMaxX;

    @Field("bbox_max_y")
    private Double bboxMaxY;
}
