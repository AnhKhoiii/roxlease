package com.roxlease.space.repository;

import com.roxlease.space.model.Floor;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface FloorRepository extends MongoRepository<Floor, String> {
    boolean existsByBlId(String BlId);
}