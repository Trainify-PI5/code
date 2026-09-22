package com.trainify.lms.repositories;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.trainify.lms.domain.entities.User;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmailAndIsActiveTrue(String email);
    Optional<User> findByEmailIgnoreCaseAndIsActiveTrue(String email);
        Optional<User> findByPasswordResetTokenHashAndPasswordResetTokenExpiresAtAfterAndIsActiveTrue(
            String tokenHash, java.time.Instant now);
    boolean existsByEmailIgnoreCase(String email);
    boolean existsByEmail(String email);
    
    java.util.List<User> findByTenantIdAndIsActiveTrue(UUID tenantId);
    long countByTenantIdAndIsActiveTrue(UUID tenantId);
    Optional<User> findByIdAndTenantId(UUID id, UUID tenantId);
}