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
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'INSTRUCTOR')")
    public ResponseEntity<LessonDto> updateLesson(
            @PathVariable UUID lessonId,
            @Valid @RequestBody CreateLessonRequest request
    ) {
        return ResponseEntity.ok(courseService.updateLesson(lessonId, request));
    }

    /** Transcricao em texto puro, pronta para o navegador baixar. */
    @GetMapping(value = "/{lessonId}/transcript", produces = "text/plain; charset=UTF-8")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<String> getTranscript(@PathVariable UUID lessonId) {
        String transcript = courseService.getLessonTranscript(lessonId);
        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=\"transcricao-" + lessonId + ".txt\"")
                .body(transcript);
    }

    @PutMapping("/{lessonId}/transcript")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'INSTRUCTOR')")
    public ResponseEntity<Void> updateTranscript(
            @PathVariable UUID lessonId,
            @RequestBody java.util.Map<String, String> body
    ) {
        courseService.updateLessonTranscript(lessonId, body.get("transcript"));
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{lessonId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'INSTRUCTOR')")
    public ResponseEntity<Void> deleteLesson(@PathVariable UUID lessonId) {
        courseService.deleteLesson(lessonId);
        return ResponseEntity.noContent().build();
    }
}
