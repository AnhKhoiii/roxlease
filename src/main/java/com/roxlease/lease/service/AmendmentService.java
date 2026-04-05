package com.roxlease.lease.service;

import com.roxlease.lease.model.Amendment;
import com.roxlease.lease.repository.AmendmentRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class AmendmentService {

    private final AmendmentRepository repository;

    public AmendmentService(AmendmentRepository repository) {
        this.repository = repository;
    }

    public Page<Amendment> getAmendmentsByLease(String lsId, Pageable pageable) {
        return repository.findByLsId(lsId, pageable);
    }

    public Amendment createAmendment(String lsId, Amendment amendment) {
        amendment.setLsId(lsId);
        amendment.setActive(false); // Mặc định là false khi tạo mới
        amendment.setCreatedAt(LocalDateTime.now());
        amendment.setUpdatedAt(LocalDateTime.now());
        return repository.save(amendment);
    }

    public Amendment updateAmendment(String id, Amendment updatedAmendment) {
        Amendment amendment = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Amendment not found"));
                
        amendment.setDescription(updatedAmendment.getDescription());
        amendment.setRequestedDate(updatedAmendment.getRequestedDate());
        amendment.setEffectiveDate(updatedAmendment.getEffectiveDate());
        amendment.setExercisedBy(updatedAmendment.getExercisedBy());
        amendment.setDocUrl(updatedAmendment.getDocUrl());
        // Không cho phép update field active từ UI này (sẽ được xử lý qua Approval workflow sau)
        amendment.setUpdatedAt(LocalDateTime.now());
        
        return repository.save(amendment);
    }

    public void deleteAmendment(String id) {
        Amendment amendment = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Amendment not found"));
                
        if (Boolean.TRUE.equals(amendment.getActive())) {
            throw new IllegalStateException("Cannot delete while objects are active");
        }
        repository.delete(amendment);
    }
}