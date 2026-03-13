package com.roxlease.system.repository;

import com.roxlease.system.model.Permissions;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface PermissionRepository extends MongoRepository<Permissions, String> {
}