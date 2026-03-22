package com.roxlease.space.repository;

import com.roxlease.space.model.Suite;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SuiteRepository extends MongoRepository<Suite, String> {
    
    List<Suite> findByFlId(String flId);
    
}