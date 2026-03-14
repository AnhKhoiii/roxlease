package com.roxlease.space.repository;

import com.roxlease.space.model.Region;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface RegionRepository extends MongoRepository<Region, String> {}