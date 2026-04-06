package com.roxlease.lease.controller;

import com.roxlease.lease.model.Lease;
import com.roxlease.lease.repository.LeaseRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Collections;

@RestController
@RequestMapping("/api/lease/leases")
public class LeaseController {

    private final LeaseRepository leaseRepository;

    public LeaseController(LeaseRepository leaseRepository) {
        this.leaseRepository = leaseRepository;
    }

    @GetMapping
    public ResponseEntity<?> getAllLeases() {
        return ResponseEntity.ok(leaseRepository.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getLeaseById(@PathVariable String id) {
        Lease lease = leaseRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Lease not found!"));
        return ResponseEntity.ok(lease);
    }

    @PostMapping
    public ResponseEntity<?> createLease(@RequestBody Lease lease) {
        if (lease.getLsId() != null && leaseRepository.existsById(lease.getLsId())) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("error", "Lease ID already exists!"));
        }
        
        lease.setCreatedAt(LocalDateTime.now());
        lease.setUpdatedAt(LocalDateTime.now());
        return ResponseEntity.ok(leaseRepository.save(lease));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateLease(@PathVariable String id, @RequestBody Lease lease) {
        Lease existing = leaseRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Lease not found!"));

        // Cập nhật text & dates
        existing.setDescription(lease.getDescription());
        existing.setSignedDate(lease.getSignedDate());
        existing.setHandoverDate(lease.getHandoverDate());
        existing.setStartDate(lease.getStartDate());
        existing.setEndDate(lease.getEndDate());
        existing.setCurrency(lease.getCurrency());
        existing.setPartyId(lease.getPartyId());
        existing.setParentLsId(lease.getParentLsId());
        existing.setPic(lease.getPic());
        existing.setAmenityId(lease.getAmenityId());
        existing.setDocUrl(lease.getDocUrl());

        // Cập nhật Space (MỚI THÊM)
        existing.setSiteId(lease.getSiteId());
        existing.setBuildingId(lease.getBuildingId());
        // Cập nhật Enums
        existing.setLsType(lease.getLsType());
        existing.setRentType(lease.getRentType());
        existing.setSpaceUse(lease.getSpaceUse());
        existing.setLandlordTenant(lease.getLandlordTenant());
        existing.setLeaseSublease(lease.getLeaseSublease());

        // Cập nhật Flags (Boolean)
        existing.setVatExcluded(lease.getVatExcluded());
        existing.setIsSign(lease.getIsSign());
        existing.setIsLandlord(lease.getIsLandlord());
        existing.setAssumeRenewal(lease.getAssumeRenewal());
        existing.setIndexCost(lease.getIndexCost());
        existing.setActive(lease.getActive());

        // Cập nhật Tài chính & Diện tích
        existing.setAmountDeposit(lease.getAmountDeposit());
        existing.setRentUnitCost(lease.getRentUnitCost());
        existing.setServiceUnitCost(lease.getServiceUnitCost());
        existing.setBaseExchangeRate(lease.getBaseExchangeRate());
        existing.setAreaNegotiated(lease.getAreaNegotiated());
        existing.setAreaCorridor(lease.getAreaCorridor());

        existing.setUpdatedAt(LocalDateTime.now());

        return ResponseEntity.ok(leaseRepository.save(existing));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteLease(@PathVariable String id) {
        if (!leaseRepository.existsById(id)) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("error", "Lease not found!"));
        }
        leaseRepository.deleteById(id);
        return ResponseEntity.ok(Collections.singletonMap("message", "Lease deleted successfully!"));
    }
}