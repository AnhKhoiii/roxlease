package com.roxlease.space.repository;

import com.roxlease.space.model.Amenity;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface AmenityRepository extends MongoRepository<Amenity, String> {
}