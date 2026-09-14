package com.trainify.lms.controllers;

import com.trainify.lms.dto.HeartbeatRequest;
import com.trainify.lms.dto.LessonProgressDto;
import com.trainify.lms.services.ProgressService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/progress")
@RequiredArgsConstructor
public class ProgressController {

    private final ProgressService progressService;

    @GetMapping("/enrollments/{enrollmentId}/lessons/{lessonId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<com.trainify.lms.domain.entities.LessonProgress> getLessonProgress(
            @PathVariable UUID enrollmentId,
            @PathVariable UUID lessonId,
            @org.springframework.security.core.annotation.AuthenticationPrincipal com.trainify.lms.security.CustomUserDetails principal) {
        
        com.trainify.lms.domain.entities.LessonProgress progress = progressService.getLessonProgress(enrollmentId, lessonId, principal.getId());
        if (progress == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(progress);
    }

    @GetMapping("/enrollments/{enrollmentId}/lessons")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<LessonProgressDto>> getCourseProgress(
            @PathVariable UUID enrollmentId,
            @org.springframework.security.core.annotation.AuthenticationPrincipal com.trainify.lms.security.CustomUserDetails principal) {

        return ResponseEntity.ok(progressService.getCourseProgress(enrollmentId, principal.getId()));
    }

    @PostMapping("/enrollments/{enrollmentId}/lessons/{lessonId}/heartbeat")
    @PreAuthorize("isAuthenticated()") // Regra poderia ser mais restritiva, ex: verificar se o aluno é dono do enrollment
    public ResponseEntity<Void> heartbeat(
            @PathVariable UUID enrollmentId,
            @PathVariable UUID lessonId,
            @Valid @RequestBody HeartbeatRequest request,
            @org.springframework.security.core.annotation.AuthenticationPrincipal com.trainify.lms.security.CustomUserDetails principal) {
        
        progressService.recordHeartbeat(enrollmentId, lessonId, request, principal.getId());
        return ResponseEntity.ok().build();
    }
}
