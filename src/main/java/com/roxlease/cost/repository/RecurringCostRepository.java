package com.roxlease.cost.repository;

import com.roxlease.cost.model.RecurringCost;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RecurringCostRepository extends MongoRepository<RecurringCost, String> {
    List<RecurringCost> findByLsId(String lsId);
}