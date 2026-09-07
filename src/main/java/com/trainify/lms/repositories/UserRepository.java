package com.trainify.lms.repositories;

import com.trainify.lms.domain.entities.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmailAndIsActiveTrue(String email);
    boolean existsByEmail(String email);
    
    java.util.List<User> findByTenantIdAndIsActiveTrue(UUID tenantId);
    Optional<User> findByIdAndTenantId(UUID id, UUID tenantId);
}