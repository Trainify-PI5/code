package com.trainify.lms.controllers;

import com.trainify.lms.dto.CreateLessonRequest;
import com.trainify.lms.dto.LessonDto;
import com.trainify.lms.services.CourseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/lessons")
@RequiredArgsConstructor
public class LessonController {

    private final CourseService courseService;

    @PutMapping("/{lessonId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR')")
    public ResponseEntity<LessonDto> updateLesson(
            @PathVariable UUID lessonId,
            @Valid @RequestBody CreateLessonRequest request
    ) {
        return ResponseEntity.ok(courseService.updateLesson(lessonId, request));
    }

    @DeleteMapping("/{lessonId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR')")
    public ResponseEntity<Void> deleteLesson(@PathVariable UUID lessonId) {
        courseService.deleteLesson(lessonId);
        return ResponseEntity.noContent().build();
    }
}
