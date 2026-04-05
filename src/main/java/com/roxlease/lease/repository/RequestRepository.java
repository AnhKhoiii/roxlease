package com.roxlease.lease.repository;

import com.roxlease.lease.model.Request;
import com.roxlease.lease.model.Enum.RQStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RequestRepository extends MongoRepository<Request, String> {
    
    Page<Request> findByStatus(RQStatus status, Pageable pageable);
    
    Page<Request> findByStatusIn(List<RQStatus> statuses, Pageable pageable);
}