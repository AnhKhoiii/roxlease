package com.roxlease.space.repository;

import com.roxlease.space.model.Country;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface CountryRepository extends MongoRepository<Country, String> { List<Country> findByRegionId(String regionId); }
