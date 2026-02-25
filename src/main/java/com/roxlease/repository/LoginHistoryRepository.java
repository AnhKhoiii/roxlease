package com.roxlease.repository;

import com.roxlease.model.LoginHistory;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface LoginHistoryRepository extends MongoRepository<LoginHistory, String> {
}