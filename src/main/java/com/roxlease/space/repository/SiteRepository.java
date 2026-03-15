package com.roxlease.space.repository;

import com.roxlease.space.model.Site;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface SiteRepository extends MongoRepository<Site, String> {
}