package com.trainify.lms.controllers;

import com.trainify.lms.dto.KpiDto;
import com.trainify.lms.services.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @GetMapping("/kpis")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'SUPER_ADMIN')")
    public ResponseEntity<KpiDto> getTenantKpis() {
        return ResponseEntity.ok(analyticsService.getTenantKpis());
    }
}
