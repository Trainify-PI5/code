package com.trainify.lms.repositories;

import com.trainify.lms.domain.entities.ActivityLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ActivityLogRepository extends JpaRepository<ActivityLog, UUID> {
    Page<ActivityLog> findByTenantIdOrderByCreatedAtDesc(UUID tenantId, Pageable pageable);
}
