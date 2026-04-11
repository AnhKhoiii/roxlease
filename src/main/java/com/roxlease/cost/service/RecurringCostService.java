package com.roxlease.cost.service;

import com.roxlease.cost.model.RecurringCost;
import com.roxlease.cost.repository.RecurringCostRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class RecurringCostService {
    @Autowired
    private RecurringCostRepository repository;

    public List<RecurringCost> getByLeaseId(String leaseId) {
        return repository.findByLsId(leaseId);
    }

    public RecurringCost saveOrUpdate(String leaseId, RecurringCost cost) {
        cost.setLsId(leaseId);
        cost.setUpdatedAt(LocalDateTime.now());
        if (cost.getRecurringCostId() == null || cost.getRecurringCostId().isEmpty()) {
            cost.setCreatedAt(LocalDateTime.now());
        }
        return repository.save(cost);
    }

    public void delete(String id) {
        repository.deleteById(id);
    }
}