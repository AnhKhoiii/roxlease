package com.roxlease.lease.service;

import com.roxlease.lease.model.Clause;
import com.roxlease.lease.repository.ClauseRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class ClauseService {

    private final ClauseRepository repository;

    public ClauseService(ClauseRepository repository) {
        this.repository = repository;
    }

    public Page<Clause> getClausesByLease(String leaseId, Pageable pageable) {
        return repository.findByLeaseId(leaseId, pageable);
    }

    public Clause createClause(String leaseId, Clause clause) {
        clause.setLeaseId(leaseId);
        if (clause.getIsActive() == null) clause.setIsActive(false);
        clause.setStatus("DRAFT");
        clause.setCreatedAt(LocalDateTime.now());
        clause.setUpdatedAt(LocalDateTime.now());
        return repository.save(clause);
    }

    public Clause updateClause(String id, Clause updatedClause) {
        Clause clause = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Clause not found"));
                
        clause.setClauseId(updatedClause.getClauseId());
        clause.setStartDate(updatedClause.getStartDate());
        clause.setEndDate(updatedClause.getEndDate());
        clause.setResponsibleParty(updatedClause.getResponsibleParty());
        clause.setExercisedBy(updatedClause.getExercisedBy());
        clause.setDescription(updatedClause.getDescription());
        clause.setDocumentUrl(updatedClause.getDocumentUrl());
        clause.setIsActive(updatedClause.getIsActive());
        clause.setUpdatedAt(LocalDateTime.now());
        
        return repository.save(clause);
    }

    public void deleteClause(String id) {
        Clause clause = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Clause not found"));
                
        if (Boolean.TRUE.equals(clause.getIsActive())) {
            throw new IllegalStateException("Cannot delete while objects are active");
        }
        
        repository.delete(clause);
    }

    public Clause submitRequest(String id) {
        Clause clause = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Clause not found"));
                
        clause.setStatus("PENDING_APPROVAL");
        clause.setUpdatedAt(LocalDateTime.now());
        return repository.save(clause);
    }
}