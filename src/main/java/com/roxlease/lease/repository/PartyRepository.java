package com.roxlease.lease.repository;

import com.roxlease.lease.model.Party;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PartyRepository extends MongoRepository<Party, String> {
}