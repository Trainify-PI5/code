package com.trainify.lms.controllers;

import com.trainify.lms.domain.entities.ActivityLog;
import com.trainify.lms.repositories.ActivityLogRepository;
import com.trainify.lms.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/audit-logs")
@RequiredArgsConstructor
public class AuditLogController {

    private final ActivityLogRepository repository;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<ActivityLog>> getLogs(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            Pageable pageable
    ) {
        var logs = repository.findByTenantIdOrderByCreatedAtDesc(userDetails.getTenantId(), pageable);
        return ResponseEntity.ok(logs);
    }
}
