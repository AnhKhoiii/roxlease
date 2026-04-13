package com.roxlease.cost.service;

import com.roxlease.cost.model.VatCountry;
import com.roxlease.cost.repository.VatCountryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class VatCountryService {

    @Autowired
    private VatCountryRepository repository;

    public List<VatCountry> getAll() {
        return repository.findAll();
    }

    public VatCountry getById(String id) {
        return repository.findById(id).orElseThrow(() -> new RuntimeException("VAT Country không tồn tại!"));
    }

    public VatCountry create(VatCountry vatCountry) {
        if (repository.existsByVatCountryId(vatCountry.getVatCountryId())) {
            throw new RuntimeException("Mã VAT Country ID đã tồn tại trong hệ thống!");
        }
        return repository.save(vatCountry);
    }

    public VatCountry update(String id, VatCountry req) {
        VatCountry existing = getById(id);
        existing.setCountryName(req.getCountryName());
        existing.setVatPercent(req.getVatPercent());
        return repository.save(existing);
    }

    public void delete(String id) {
        repository.deleteById(id);
    }
}