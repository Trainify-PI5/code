package com.trainify.lms.controllers;

import com.trainify.lms.dto.EnrollmentDto;
import com.trainify.lms.security.CustomUserDetails;
import com.trainify.lms.services.EnrollmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/enrollments")
@RequiredArgsConstructor
public class EnrollmentController {

    private final EnrollmentService enrollmentService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<EnrollmentDto>> getUserEnrollments(
            @AuthenticationPrincipal CustomUserDetails principal) {
        List<EnrollmentDto> enrollments = enrollmentService.getUserEnrollments(principal.getId());
        return ResponseEntity.ok(enrollments);
    }

    @GetMapping("/all")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'INSTRUCTOR', 'SUPER_ADMIN')")
    public ResponseEntity<List<EnrollmentDto>> getAllEnrollments(
            @AuthenticationPrincipal CustomUserDetails principal) {
        List<EnrollmentDto> enrollments = enrollmentService.getAllEnrollments(principal.getTenantId());
        return ResponseEntity.ok(enrollments);
    }
}
