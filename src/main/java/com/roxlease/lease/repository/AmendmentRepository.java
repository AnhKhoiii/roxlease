package com.roxlease.lease.repository;

import com.roxlease.lease.model.Amendment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AmendmentRepository extends MongoRepository<Amendment, String> {
    Page<Amendment> findByLsId(String lsId, Pageable pageable);
}