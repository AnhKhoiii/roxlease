package com.roxlease.system.repository;

import com.roxlease.system.model.LoginHistory;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface LoginHistoryRepository extends MongoRepository<LoginHistory, String> {
}