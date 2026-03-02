package com.roxlease.repository;

import com.roxlease.model.Permissions;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface PermissionRepository extends MongoRepository<Permissions, String> {
}