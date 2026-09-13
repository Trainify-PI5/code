package com.trainify.lms.controllers;

import com.trainify.lms.domain.enums.EngagementPeriod;
import com.trainify.lms.dto.CourseCompletionDto;
import com.trainify.lms.dto.EngagementPointDto;
import com.trainify.lms.dto.KpiDto;
import com.trainify.lms.dto.StatusCountDto;
import com.trainify.lms.services.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

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

    @GetMapping("/engagement")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'SUPER_ADMIN')")
    public ResponseEntity<List<EngagementPointDto>> getEngagement(
            @RequestParam(defaultValue = "LAST_30_DAYS") EngagementPeriod period) {
        return ResponseEntity.ok(analyticsService.getEngagement(period));
    }

    @GetMapping("/enrollment-status")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'SUPER_ADMIN')")
    public ResponseEntity<List<StatusCountDto>> getEnrollmentStatusDistribution() {
        return ResponseEntity.ok(analyticsService.getEnrollmentStatusDistribution());
    }

    @GetMapping("/course-completion")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'SUPER_ADMIN')")
    public ResponseEntity<List<CourseCompletionDto>> getCourseCompletion() {
        return ResponseEntity.ok(analyticsService.getCourseCompletion());
    }
}
