package com.roxlease.lease.repository;

import com.roxlease.lease.model.Clause;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ClauseRepository extends MongoRepository<Clause, String> {
    Page<Clause> findByLeaseId(String leaseId, Pageable pageable);
}