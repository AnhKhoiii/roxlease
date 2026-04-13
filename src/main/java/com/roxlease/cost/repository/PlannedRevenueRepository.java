package com.roxlease.cost.repository;

import com.roxlease.cost.model.PlannedRevenue;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface PlannedRevenueRepository extends MongoRepository<PlannedRevenue, String> {
    
    @Query("{ $and: [ " +
           " { $or: [ { $where: '?0 == null' }, { 'year': ?0 } ] }, " +
           " { $or: [ { $where: '?1 == null' }, { 'month': ?1 } ] } " +
           "] }")
    Page<PlannedRevenue> findWithFilters(Integer year, Integer month, Pageable pageable);
}