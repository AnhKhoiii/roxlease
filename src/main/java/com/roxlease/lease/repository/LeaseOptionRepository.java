package com.roxlease.lease.repository;

import com.roxlease.lease.model.LeaseOption;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface LeaseOptionRepository extends MongoRepository<LeaseOption, String> {
    Page<LeaseOption> findByLsId(String lsId, Pageable pageable);
}