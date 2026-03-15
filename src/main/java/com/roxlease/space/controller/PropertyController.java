package com.roxlease.space.controller;

import com.roxlease.space.model.Building;
import com.roxlease.space.model.Floor;
import com.roxlease.space.model.Site;
import com.roxlease.space.repository.BuildingRepository;
import com.roxlease.space.repository.FloorRepository;
import com.roxlease.space.repository.SiteRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;

@RestController
@RequestMapping("/api/space/properties")
public class PropertyController {

    private final SiteRepository siteRepo;
    private final BuildingRepository buildingRepo;
    private final FloorRepository floorRepo;

    public PropertyController(SiteRepository siteRepo, BuildingRepository buildingRepo, FloorRepository floorRepo) {
        this.siteRepo = siteRepo;
        this.buildingRepo = buildingRepo;
        this.floorRepo = floorRepo;
    }

    // ================= SITE API =================
    @GetMapping("/sites")
    public ResponseEntity<?> getAllSites() {
        return ResponseEntity.ok(siteRepo.findAll());
    }

    @PostMapping("/sites")
    public ResponseEntity<?> createSite(@RequestBody Site req) {
        if (siteRepo.existsById(req.getSiteId())) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("error", "Site ID already exists!"));
        }
        return ResponseEntity.ok(siteRepo.save(req));
    }

    @PutMapping("/sites/{id}")
    public ResponseEntity<?> updateSite(@PathVariable String id, @RequestBody Site req) {
        if (!siteRepo.existsById(id)) return ResponseEntity.badRequest().body(Collections.singletonMap("error", "Site not found!"));
        // Because req has all fields sent from frontend, we overwrite directly
        req.setSiteId(id);
        return ResponseEntity.ok(siteRepo.save(req));
    }

    @DeleteMapping("/sites/{id}")
    public ResponseEntity<?> deleteSite(@PathVariable String id) {
        if (buildingRepo.existsBySiteId(id)) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("error", "Cannot delete! This Site contains Buildings."));
        }
        siteRepo.deleteById(id);
        return ResponseEntity.ok(Collections.singletonMap("message", "Site deleted successfully!"));
    }

    // ================= BUILDING API =================
    @GetMapping("/buildings")
    public ResponseEntity<?> getAllBuildings() {
        return ResponseEntity.ok(buildingRepo.findAll());
    }

    @PostMapping("/buildings")
    public ResponseEntity<?> createBuilding(@RequestBody Building req) {
        if (buildingRepo.existsById(req.getBlId())) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("error", "Building ID already exists!"));
        }
        if (!siteRepo.existsById(req.getSiteId())) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("error", "Site ID not found in the system!"));
        }
        return ResponseEntity.ok(buildingRepo.save(req));
    }

    @PutMapping("/buildings/{id}")
    public ResponseEntity<?> updateBuilding(@PathVariable String id, @RequestBody Building req) {
        if (!buildingRepo.existsById(id)) return ResponseEntity.badRequest().body(Collections.singletonMap("error", "Building not found!"));
        req.setBlId(id);
        return ResponseEntity.ok(buildingRepo.save(req));
    }

    @DeleteMapping("/buildings/{id}")
    public ResponseEntity<?> deleteBuilding(@PathVariable String id) {
        if (floorRepo.existsByBlId(id)) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("error", "Cannot delete! This Building contains Floors."));
        }
        buildingRepo.deleteById(id);
        return ResponseEntity.ok(Collections.singletonMap("message", "Building deleted successfully!"));
    }

    // ================= FLOOR API =================
    @GetMapping("/floors")
    public ResponseEntity<?> getAllFloors() {
        return ResponseEntity.ok(floorRepo.findAll());
    }

    @PostMapping("/floors")
    public ResponseEntity<?> createFloor(@RequestBody Floor req) {
        if (floorRepo.existsById(req.getFlId())) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("error", "Floor ID already exists!"));
        }
        if (!buildingRepo.existsById(req.getBlId())) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("error", "Building ID not found in the system!"));
        }
        return ResponseEntity.ok(floorRepo.save(req));
    }

    @PutMapping("/floors/{id}")
    public ResponseEntity<?> updateFloor(@PathVariable String id, @RequestBody Floor req) {
        if (!floorRepo.existsById(id)) return ResponseEntity.badRequest().body(Collections.singletonMap("error", "Floor not found!"));
        req.setFlId(id);
        return ResponseEntity.ok(floorRepo.save(req));
    }

    @DeleteMapping("/floors/{id}")
    public ResponseEntity<?> deleteFloor(@PathVariable String id) {
        floorRepo.deleteById(id);
        return ResponseEntity.ok(Collections.singletonMap("message", "Floor deleted successfully!"));
    }
}