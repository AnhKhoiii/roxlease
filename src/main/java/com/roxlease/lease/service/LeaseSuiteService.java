package com.roxlease.lease.service;

import com.roxlease.lease.model.LeaseSuite;
import com.roxlease.lease.repository.LeaseSuiteRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class LeaseSuiteService {

    private final LeaseSuiteRepository repository;

    public LeaseSuiteService(LeaseSuiteRepository repository) {
        this.repository = repository;
    }

    public Page<LeaseSuite> getSuitesByLease(String lsId, Pageable pageable) {
        return repository.findByLsId(lsId, pageable);
    }

    public LeaseSuite createLeaseSuite(String lsId, LeaseSuite leaseSuite) {
        leaseSuite.setLsId(lsId);
        leaseSuite.setActive(false);
        leaseSuite.setCreatedAt(LocalDateTime.now());
        leaseSuite.setUpdatedAt(LocalDateTime.now());
        return repository.save(leaseSuite);
    }

    public LeaseSuite updateLeaseSuite(String id, LeaseSuite updatedData) {
        LeaseSuite suite = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Lease Suite not found"));
                
        suite.setSuId(updatedData.getSuId());
        suite.setDateStart(updatedData.getDateStart());
        suite.setDateEnd(updatedData.getDateEnd());
        suite.setDocUrl(updatedData.getDocUrl());
        suite.setUpdatedAt(LocalDateTime.now());
        
        return repository.save(suite);
    }

    public void deleteLeaseSuite(String id) {
        LeaseSuite suite = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Lease Suite not found"));
                
        repository.delete(suite);
    }
}