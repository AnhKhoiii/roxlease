package com.roxlease.lease.controller;

import com.roxlease.lease.model.Party;
import com.roxlease.lease.repository.PartyRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Collections;

@RestController
@RequestMapping("/api/lease/parties")
public class PartyController {

    private final PartyRepository partyRepository;

    public PartyController(PartyRepository partyRepository) {
        this.partyRepository = partyRepository;
    }

    @GetMapping
    public ResponseEntity<?> getAllParties() {
        return ResponseEntity.ok(partyRepository.findAll());
    }

    @PostMapping
    public ResponseEntity<?> createParty(@RequestBody Party party) {
        if (partyRepository.existsById(party.getPartyId())) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("error", "Party ID already exists!"));
        }
        party.setCreatedAt(LocalDateTime.now());
        party.setUpdatedAt(LocalDateTime.now());
        return ResponseEntity.ok(partyRepository.save(party));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateParty(@PathVariable String id, @RequestBody Party party) {
        Party existing = partyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Party not found!"));

        existing.setPartyName(party.getPartyName());
        existing.setIsLandlord(party.getIsLandlord());
        existing.setEmail(party.getEmail());
        existing.setPhone(party.getPhone());
        existing.setUpdatedAt(LocalDateTime.now());

        return ResponseEntity.ok(partyRepository.save(existing));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteParty(@PathVariable String id) {
        if (!partyRepository.existsById(id)) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("error", "Party not found!"));
        }
        partyRepository.deleteById(id);
        return ResponseEntity.ok(Collections.singletonMap("message", "Party deleted successfully!"));
    }
}