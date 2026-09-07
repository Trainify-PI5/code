package com.trainify.lms.controllers;

import com.trainify.lms.dto.*;
import com.trainify.lms.security.CustomUserDetails;
import com.trainify.lms.services.AssessmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/assessments")
@RequiredArgsConstructor
public class AssessmentController {

    private final AssessmentService assessmentService;

    @GetMapping("/lessons/{lessonId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<AssessmentDto> getAssessmentByLessonId(@PathVariable UUID lessonId) {
        return ResponseEntity.ok(assessmentService.getAssessmentByLessonId(lessonId));
    }

    @PostMapping("/lessons/{lessonId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR')")
    public ResponseEntity<AssessmentDto> createOrUpdateAssessment(
            @PathVariable UUID lessonId,
            @Valid @RequestBody CreateAssessmentRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(assessmentService.createOrUpdateAssessment(lessonId, request, userDetails.getTenantId()));
    }

    @PostMapping("/lessons/{lessonId}/submit")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<AssessmentResultDto> submitAssessment(
            @PathVariable UUID lessonId,
            @Valid @RequestBody SubmitAssessmentRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(assessmentService.submitAssessment(lessonId, userDetails.getId(), request));
    }
}
