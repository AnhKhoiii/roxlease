package com.roxlease.lease.repository;

import com.roxlease.lease.model.LeaseSuite;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface LeaseSuiteRepository extends MongoRepository<LeaseSuite, String> {
    Page<LeaseSuite> findByLsId(String lsId, Pageable pageable);
}