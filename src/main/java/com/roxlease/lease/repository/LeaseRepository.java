package com.roxlease.lease.repository;

import com.roxlease.lease.model.Lease;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface LeaseRepository extends MongoRepository<Lease, String> {
}