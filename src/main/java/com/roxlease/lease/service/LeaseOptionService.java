package com.roxlease.lease.service;

import com.roxlease.lease.model.LeaseOption;
import com.roxlease.lease.repository.LeaseOptionRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class LeaseOptionService {

    private final LeaseOptionRepository repository;

    public LeaseOptionService(LeaseOptionRepository repository) {
        this.repository = repository;
    }

    public Page<LeaseOption> getOptionsByLease(String lsId, Pageable pageable) {
        return repository.findByLsId(lsId, pageable);
    }

    public LeaseOption createOption(String lsId, LeaseOption option) {
        option.setLsId(lsId);
        option.setActive(false); // Mặc định false, chờ Request được approve thì mới set true
        option.setCreatedAt(LocalDateTime.now());
        option.setUpdatedAt(LocalDateTime.now());
        return repository.save(option);
    }

    public LeaseOption updateOption(String id, LeaseOption updatedOption) {
        LeaseOption option = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Option not found"));
                
        option.setOpDescription(updatedOption.getOpDescription());
        option.setOpType(updatedOption.getOpType());
        option.setSuiteId(updatedOption.getSuiteId());
        option.setIssueDate(updatedOption.getIssueDate());
        option.setDateMatchLs(updatedOption.getDateMatchLs());
        option.setStartDate(updatedOption.getStartDate());
        option.setEndDate(updatedOption.getEndDate());
        option.setExercisedBy(updatedOption.getExercisedBy());
        option.setAreaInvolved(updatedOption.getAreaInvolved());
        option.setCostEst(updatedOption.getCostEst());
        option.setDocUrl(updatedOption.getDocUrl());
        option.setUpdatedAt(LocalDateTime.now());
        
        return repository.save(option);
    }

    public void deleteOption(String id) {
        LeaseOption option = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Option not found"));
                
        if (Boolean.TRUE.equals(option.getActive())) {
            throw new IllegalStateException("Cannot delete while objects are active");
        }
        repository.delete(option);
    }
}