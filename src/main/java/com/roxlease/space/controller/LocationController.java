package com.roxlease.space.controller;

import com.roxlease.space.model.City;
import com.roxlease.space.model.Country;
import com.roxlease.space.model.Region;
import com.roxlease.space.repository.CityRepository;
import com.roxlease.space.repository.CountryRepository;
import com.roxlease.space.repository.RegionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/space/locations")
public class LocationController {

    private final RegionRepository regionRepo;
    private final CountryRepository countryRepo;
    private final CityRepository cityRepo;

    public LocationController(RegionRepository regionRepo, CountryRepository countryRepo, CityRepository cityRepo) {
        this.regionRepo = regionRepo;
        this.countryRepo = countryRepo;
        this.cityRepo = cityRepo;
    }

    // ==========================================
    // 1. LẤY TOÀN BỘ DỮ LIỆU ĐỂ HIỂN THỊ CÂY (TREE)
    // ==========================================
    @GetMapping("/tree")
    public ResponseEntity<?> getLocationTree() {
        Map<String, Object> result = new HashMap<>();
        result.put("regions", regionRepo.findAll());
        result.put("countries", countryRepo.findAll());
        result.put("cities", cityRepo.findAll());
        return ResponseEntity.ok(result);
    }

    // ==========================================
    // 2. REGION API
    // ==========================================
    @PostMapping("/regions")
    public ResponseEntity<?> createRegion(@RequestBody Region req) {
        if (regionRepo.existsById(req.getRegionId())) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("error", "Region ID already exists!"));
        }
        return ResponseEntity.ok(regionRepo.save(req));
    }

    @PutMapping("/regions/{id}")
    public ResponseEntity<?> updateRegion(@PathVariable String id, @RequestBody Region req) {
        Region existing = regionRepo.findById(id).orElseThrow(() -> new RuntimeException("Region not found!"));
        existing.setRegionName(req.getRegionName());
        return ResponseEntity.ok(regionRepo.save(existing));
    }

    @DeleteMapping("/regions/{id}")
    public ResponseEntity<?> deleteRegion(@PathVariable String id) {
        // KIỂM TRA RÀNG BUỘC
        if (countryRepo.existsByRegionId(id)) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("error", "Cannot delete Region in use."));
        }
        
        regionRepo.deleteById(id);
        return ResponseEntity.ok(Collections.singletonMap("message", "Region deleted successfully!"));
    }

    // ==========================================
    // 3. COUNTRY API
    // ==========================================
    @PostMapping("/countries")
    public ResponseEntity<?> createCountry(@RequestBody Country req) {
        if (countryRepo.existsById(req.getCountryId())) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("error", "Country ID already exists!"));
        }
        return ResponseEntity.ok(countryRepo.save(req));
    }

    @PutMapping("/countries/{id}")
    public ResponseEntity<?> updateCountry(@PathVariable String id, @RequestBody Country req) {
        Country existing = countryRepo.findById(id).orElseThrow(() -> new RuntimeException("Country not found!"));
        existing.setCountryName(req.getCountryName());
        existing.setRegionId(req.getRegionId());
        return ResponseEntity.ok(countryRepo.save(existing));
    }

    @DeleteMapping("/countries/{id}")
    public ResponseEntity<?> deleteCountry(@PathVariable String id) {
        if (cityRepo.existsByCountryId(id)) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("error", "Cannot delete Country in use."));
        }

        countryRepo.deleteById(id);
        return ResponseEntity.ok(Collections.singletonMap("message", "Country deleted successfully!"));
    }

    // ==========================================
    // 4. CITY API
    // ==========================================

    @GetMapping("/cities")
    public ResponseEntity<?> getAllCities() {
        return ResponseEntity.ok(cityRepo.findAll());
    }

    @PostMapping("/cities")
    public ResponseEntity<?> createCity(@RequestBody City req) {
        if (cityRepo.existsById(req.getCityId())) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("error", "City ID already exists!"));
        }
        try {
            Country country = countryRepo.findById(req.getCountryId())
                    .orElseThrow(() -> new RuntimeException("Country ID not found!"));
            req.setRegionId(country.getRegionId()); // TỰ ĐỘNG ÉP REGION ID THEO COUNTRY
            return ResponseEntity.ok(cityRepo.save(req));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("error", e.getMessage()));
        }
    }

    @PutMapping("/cities/{id}")
    public ResponseEntity<?> updateCity(@PathVariable String id, @RequestBody City req) {
        try {
            City existing = cityRepo.findById(id).orElseThrow(() -> new RuntimeException("City not found!"));
            Country country = countryRepo.findById(req.getCountryId())
                    .orElseThrow(() -> new RuntimeException("Country ID not found!"));

            existing.setCityName(req.getCityName());
            existing.setCountryId(req.getCountryId());
            existing.setRegionId(country.getRegionId()); 
            existing.setTimezone(req.getTimezone());

            return ResponseEntity.ok(cityRepo.save(existing));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("error", e.getMessage()));
        }
    }

    @DeleteMapping("/cities/{id}")
    public ResponseEntity<?> deleteCity(@PathVariable String id) {
        cityRepo.deleteById(id);
        return ResponseEntity.ok(Collections.singletonMap("message", "City deleted successfully!"));
    }
}