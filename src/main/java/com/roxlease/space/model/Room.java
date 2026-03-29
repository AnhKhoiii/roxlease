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
@Document(collection = "rooms")
public class Room {
    @Id
    private String roomId;

    @Field("cad_object_id")
    private String cadObjectId;

    @Field("fl_id")
    private String flId;

    @Field("geometry")
    private Map<String, Object> geometry;

    @Field("room_code")
    private String roomCode;

    @Field("room_name")
    private String roomName;

    private Double area;

    private Integer version = 1;
}
