package com.roxlease.cost.repository;

import com.roxlease.cost.model.VatCountry;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface VatCountryRepository extends MongoRepository<VatCountry, String> {
    boolean existsByVatCountryId(String vatCountryId);
}