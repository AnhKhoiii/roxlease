package com.roxlease.lease.controller;

import com.roxlease.lease.model.Contact;
import com.roxlease.lease.repository.ContactRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Collections;

@RestController
@RequestMapping("/api/lease/contacts")
public class ContactController {

    private final ContactRepository contactRepository;

    public ContactController(ContactRepository contactRepository) {
        this.contactRepository = contactRepository;
    }

    // 1. GET: Lấy danh sách Contact (có lọc theo lsId nếu được truyền lên)
    @GetMapping
    public ResponseEntity<?> getContacts(@RequestParam(required = false) String lsId) {
        if (lsId != null && !lsId.isEmpty()) {
            return ResponseEntity.ok(contactRepository.findByLsId(lsId));
        }
        return ResponseEntity.ok(contactRepository.findAll());
    }

    // 2. POST: Thêm mới Contact
    @PostMapping
    public ResponseEntity<?> createContact(@RequestBody Contact contact) {
        contact.setCreatedAt(LocalDateTime.now());
        contact.setUpdatedAt(LocalDateTime.now());
        return ResponseEntity.ok(contactRepository.save(contact));
    }

    // 3. PUT: Cập nhật Contact
    @PutMapping("/{id}")
    public ResponseEntity<?> updateContact(@PathVariable String id, @RequestBody Contact contact) {
        Contact existing = contactRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Contact not found!"));

        existing.setContactName(contact.getContactName());
        existing.setContactRole(contact.getContactRole());
        existing.setCompany(contact.getCompany());
        existing.setEmail(contact.getEmail());
        existing.setPhone(contact.getPhone());
        
        existing.setUpdatedAt(LocalDateTime.now());

        return ResponseEntity.ok(contactRepository.save(existing));
    }

    // 4. DELETE: Xóa Contact
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteContact(@PathVariable String id) {
        if (!contactRepository.existsById(id)) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("error", "Contact not found!"));
        }
        contactRepository.deleteById(id);
        return ResponseEntity.ok(Collections.singletonMap("message", "Contact deleted successfully!"));
    }
}