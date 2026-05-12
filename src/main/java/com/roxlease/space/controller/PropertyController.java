package com.roxlease.space.controller;

import com.roxlease.space.model.Building;
import com.roxlease.space.model.Floor;
import com.roxlease.space.model.Site;
import com.roxlease.space.model.Room;
import com.roxlease.space.model.Suite;
import com.roxlease.space.repository.BuildingRepository;
import com.roxlease.space.repository.FloorRepository;
import com.roxlease.space.repository.SiteRepository;
import com.roxlease.space.repository.RoomRepository;
import com.roxlease.space.repository.SuiteRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;

@RestController
@RequestMapping("/api/space/properties")
public class PropertyController {

    private final SiteRepository siteRepo;
    private final BuildingRepository buildingRepo;
    private final FloorRepository floorRepo;
    private final RoomRepository roomRepo;
    private final SuiteRepository suiteRepo;

    // Cập nhật constructor để inject RoomRepository và SuiteRepository
    public PropertyController(SiteRepository siteRepo, BuildingRepository buildingRepo, FloorRepository floorRepo, RoomRepository roomRepo, SuiteRepository suiteRepo) {
        this.siteRepo = siteRepo;
        this.buildingRepo = buildingRepo;
        this.floorRepo = floorRepo;
        this.roomRepo = roomRepo;
        this.suiteRepo = suiteRepo;
    }

    // ================= HELPER SYNC AREA =================
    private void syncFloorArea(String floorId) {
        if (floorId == null || floorId.isEmpty() || !floorRepo.existsById(floorId)) return;
        double totalRoomArea = roomRepo.findAll().stream()
                .filter(r -> floorId.equals(r.getFlId()))
                .mapToDouble(r -> r.getArea() != null ? r.getArea() : 0.0).sum();
        double totalSuiteArea = suiteRepo.findAll().stream()
                .filter(s -> floorId.equals(s.getFlId()))
                .mapToDouble(s -> s.getArea() != null ? s.getArea() : 0.0).sum();
        
        double totalNfa = totalRoomArea + totalSuiteArea;
        floorRepo.findById(floorId).ifPresent(f -> {
            f.setNfa(totalNfa);
            if (f.getGfa() == null || f.getGfa() < totalNfa) f.setGfa(totalNfa);
            floorRepo.save(f);
            syncBuildingArea(f.getBlId());
        });
    }

    private void syncBuildingArea(String buildingId) {
        if (buildingId == null || buildingId.isEmpty() || !buildingRepo.existsById(buildingId)) return;
        double totalGfa = floorRepo.findAll().stream()
                .filter(f -> buildingId.equals(f.getBlId()))
                .mapToDouble(f -> f.getGfa() != null ? f.getGfa() : 0.0).sum();
        buildingRepo.findById(buildingId).ifPresent(b -> {
            b.setAreaGrossInt(totalGfa);
            b.setAreaGrossExt(totalGfa);
            buildingRepo.save(b);
        });
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
    public ResponseEntity<?> getAllFloors(@RequestParam(required = false) String buildingId) {
        if (buildingId != null && !buildingId.isEmpty()) {
            return ResponseEntity.ok(floorRepo.findAll().stream()
                    .filter(f -> buildingId.equals(f.getBlId())) // Chú ý: Dùng getBlId() hoặc getBuildingId() tùy model của bạn
                    .collect(java.util.stream.Collectors.toList()));
        }
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
        Floor saved = floorRepo.save(req);
        syncBuildingArea(saved.getBlId());
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/floors/{id}")
    public ResponseEntity<?> updateFloor(@PathVariable String id, @RequestBody Floor req) {
        if (!floorRepo.existsById(id)) return ResponseEntity.badRequest().body(Collections.singletonMap("error", "Floor not found!"));
        req.setFlId(id);
        Floor saved = floorRepo.save(req);
        syncBuildingArea(saved.getBlId());
        return ResponseEntity.ok(saved);
    }
    
    @GetMapping("/rooms")
    public ResponseEntity<?> getAllRooms() {
        return ResponseEntity.ok(roomRepo.findAll());
    }

    @GetMapping("/suites")
    public ResponseEntity<?> getAllSuites(@RequestParam(required = false) String floorId) {
        if (floorId != null && !floorId.isEmpty()) {
            return ResponseEntity.ok(suiteRepo.findAll().stream()
                    .filter(s -> floorId.equals(s.getFlId())) // Chú ý: Dùng getFlId() tùy model của bạn
                    .collect(java.util.stream.Collectors.toList()));
        }
        return ResponseEntity.ok(suiteRepo.findAll());
    }

    // THÊM MỚI API NÀY CHO TAB LEASE OPTIONS & SUITES Ở FRONTEND
    @GetMapping("/suites/available")
    public ResponseEntity<?> getAvailableSuites() {
        // Trả về các Suite có thể thuê (Hiện tại trả về all, nếu sau này bạn có trường status thì bỏ comment dòng filter bên dưới)
        return ResponseEntity.ok(suiteRepo.findAll().stream()
                // .filter(s -> "AVAILABLE".equals(s.getStatus()))
                .collect(java.util.stream.Collectors.toList()));
    }

    @DeleteMapping("/floors/{id}")
    @Transactional
    public ResponseEntity<?> deleteFloor(@PathVariable String id) {
        Floor floor = floorRepo.findById(id).orElse(null);
        String blId = floor != null ? floor.getBlId() : null;
        
        roomRepo.deleteByFlId(id);
        suiteRepo.deleteByFlId(id);
        floorRepo.deleteById(id);
        
        if (blId != null) syncBuildingArea(blId);
        return ResponseEntity.ok(Collections.singletonMap("message", "Floor and its associated Rooms/Suites deleted successfully!"));
    }

    // ================= SỬA ROOM =================
    @PutMapping("/rooms/{id}")
    public ResponseEntity<?> updateRoom(@PathVariable String id, @RequestBody Room req) {
        if (!roomRepo.existsById(id)) return ResponseEntity.badRequest().body(Collections.singletonMap("error", "Room not found!"));
        req.setRoomId(id);
        Room saved = roomRepo.save(req);
        syncFloorArea(saved.getFlId());
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/rooms/{id}")
    public ResponseEntity<?> deleteRoom(@PathVariable String id) {
        Room room = roomRepo.findById(id).orElse(null);
        String flId = room != null ? room.getFlId() : null;
        roomRepo.deleteById(id);
        if (flId != null) syncFloorArea(flId);
        return ResponseEntity.ok(Collections.singletonMap("message", "Room deleted successfully!"));
    }

    // ================= SỬA SUITE =================
    @PutMapping("/suites/{id}")
    public ResponseEntity<?> updateSuite(@PathVariable String id, @RequestBody Suite req) {
        if (!suiteRepo.existsById(id)) return ResponseEntity.badRequest().body(Collections.singletonMap("error", "Suite not found!"));
        req.setSuiteId(id);
        Suite saved = suiteRepo.save(req);
        syncFloorArea(saved.getFlId());
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/suites/{id}")
    public ResponseEntity<?> deleteSuite(@PathVariable String id) {
        Suite suite = suiteRepo.findById(id).orElse(null);
        String flId = suite != null ? suite.getFlId() : null;
        suiteRepo.deleteById(id);
        if (flId != null) syncFloorArea(flId);
        return ResponseEntity.ok(Collections.singletonMap("message", "Suite deleted successfully!"));
    }
}