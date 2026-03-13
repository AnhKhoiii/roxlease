package com.roxlease.repository;

import com.roxlease.model.ActiveSession;

import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.Optional;

public interface ActiveSessionRepository extends MongoRepository<ActiveSession, String> {
    Optional<ActiveSession> findByToken(String token);
    void deleteByToken(String token);
    
    void deleteAllByUsername(String username); 
}