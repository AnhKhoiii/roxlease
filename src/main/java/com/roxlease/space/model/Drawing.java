package com.roxlease.space.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import java.time.LocalDateTime;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "drawings")
public class Drawing {
    @Id
    private String drawingId;

    @Field("fl_id")
    private String flId;

    @Field("dwg_path")
    private String dwgPath;

    @Field("json_data")
    private Map<String, Object> jsonData;

    @Field("svg_data")
    private String svgData;

    @Field("uploaded_date")
    private LocalDateTime uploadedDate;

    private String version;
}
