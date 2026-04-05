package com.roxlease.lease.repository;

import com.roxlease.lease.model.Contact;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ContactRepository extends MongoRepository<Contact, String> {
    // Hàm này giúp lấy danh sách liên hệ theo mã Lease ID (lsId)
    List<Contact> findByLsId(String lsId);
}