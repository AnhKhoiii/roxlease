package com.roxlease.cost.service;

import com.roxlease.cost.model.PlannedRevenue;
import com.roxlease.cost.repository.PlannedRevenueRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class PlannedRevenueService {

    @Autowired
    private PlannedRevenueRepository repository;

    public Page<PlannedRevenue> getFilteredData(Integer year, Integer month, Pageable pageable) {
        return repository.findWithFilters(year, month, pageable);
    }

    public PlannedRevenue getById(String id) {
        return repository.findById(id).orElseThrow(() -> new RuntimeException("Data not found"));
    }

    public PlannedRevenue save(PlannedRevenue data) {
        if (data.getId() == null || data.getId().isEmpty()) {
            data.setCreatedAt(LocalDateTime.now());
        } else {
            PlannedRevenue existing = getById(data.getId());
            data.setCreatedAt(existing.getCreatedAt());
        }
        data.setUpdatedAt(LocalDateTime.now());
        return repository.save(data);
    }

    public void delete(String id) {
        repository.deleteById(id);
    }
}