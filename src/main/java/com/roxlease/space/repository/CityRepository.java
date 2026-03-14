package com.roxlease.space.repository;

import com.roxlease.space.model.City;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface CityRepository extends MongoRepository<City, String> { List<City> findByCountryId(String countryId); }
