package com.roxlease.space.controller;

import com.roxlease.space.model.Amenity;
import com.roxlease.space.repository.AmenityRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;

@RestController
@RequestMapping("/api/space/amenities")
public class AmenityController {

    private final AmenityRepository amenityRepo;

    public AmenityController(AmenityRepository amenityRepo) {
        this.amenityRepo = amenityRepo;
    }

    @GetMapping
    public ResponseEntity<?> getAllAmenities() {
        return ResponseEntity.ok(amenityRepo.findAll());
    }

    @PostMapping
    public ResponseEntity<?> createAmenity(@RequestBody Amenity req) {
        if (amenityRepo.existsById(req.getAmenityId())) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("error", "Amenity ID already exists!"));
        }
        return ResponseEntity.ok(amenityRepo.save(req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateAmenity(@PathVariable String id, @RequestBody Amenity req) {
        if (!amenityRepo.existsById(id)) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("error", "Amenity not found!"));
        }
        req.setAmenityId(id);
        return ResponseEntity.ok(amenityRepo.save(req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteAmenity(@PathVariable String id) {
        amenityRepo.deleteById(id);
        return ResponseEntity.ok(Collections.singletonMap("message", "Deleted Amenity successfully!"));
    }
}