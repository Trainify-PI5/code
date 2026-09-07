package com.trainify.lms.controllers;

import com.trainify.lms.dto.CreateLessonRequest;
import com.trainify.lms.dto.LessonDto;
import com.trainify.lms.services.CourseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/modules")
@RequiredArgsConstructor
public class ModuleController {

    private final CourseService courseService;

    @PostMapping("/{moduleId}/lessons")
    @PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR')")
    public ResponseEntity<LessonDto> addLesson(
            @PathVariable UUID moduleId,
            @Valid @RequestBody CreateLessonRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(courseService.addLesson(moduleId, request));
    }

    @PutMapping("/{moduleId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR')")
    public ResponseEntity<com.trainify.lms.dto.ModuleDto> updateModule(
            @PathVariable UUID moduleId,
            @Valid @RequestBody com.trainify.lms.dto.CreateModuleRequest request
    ) {
        return ResponseEntity.ok(courseService.updateModule(moduleId, request));
    }

    @DeleteMapping("/{moduleId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR')")
    public ResponseEntity<Void> deleteModule(@PathVariable UUID moduleId) {
        courseService.deleteModule(moduleId);
        return ResponseEntity.noContent().build();
    }
}
