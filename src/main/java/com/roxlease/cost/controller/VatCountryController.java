package com.roxlease.cost.controller;

import com.roxlease.cost.model.VatCountry;
import com.roxlease.cost.service.VatCountryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;

@RestController
@RequestMapping("/api/cost/vat-countries")
public class VatCountryController {

    @Autowired
    private VatCountryService service;

    @GetMapping
    public ResponseEntity<?> getAll() {
        return ResponseEntity.ok(service.getAll());
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody VatCountry vatCountry) {
        try {
            return ResponseEntity.ok(service.create(vatCountry));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable String id, @RequestBody VatCountry vatCountry) {
        try {
            return ResponseEntity.ok(service.update(id, vatCountry));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable String id) {
        try {
            service.delete(id);
            return ResponseEntity.ok(Collections.singletonMap("message", "Xóa thành công!"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Collections.singletonMap("error", "Lỗi khi xóa!"));
        }
    }
}