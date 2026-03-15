package com.roxlease.space.repository;

import com.roxlease.space.model.Building;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface BuildingRepository extends MongoRepository<Building, String> {
    boolean existsBySiteId(String siteId);
}