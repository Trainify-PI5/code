package com.trainify.lms.controllers;

import com.trainify.lms.domain.entities.Tenant;
import com.trainify.lms.dto.*;
import com.trainify.lms.security.CustomUserDetails;
import com.trainify.lms.services.CourseService;
import com.trainify.lms.services.EnrollmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/courses")
@RequiredArgsConstructor
public class CourseController {

    private final CourseService courseService;
    private final EnrollmentService enrollmentService;

    @GetMapping
    public ResponseEntity<List<CourseDto>> getPublishedCourses(@AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(courseService.getPublishedCourses(userDetails.getTenantId()));
    }

    @GetMapping("/all")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'INSTRUCTOR')")
    public ResponseEntity<List<CourseDto>> getAllCourses(@AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(courseService.getAllCoursesByTenant(userDetails.getTenantId()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<CourseDto> getCourseById(@PathVariable UUID id) {
        return ResponseEntity.ok(courseService.getCourseById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR')")
    public ResponseEntity<CourseDto> createCourse(
            @Valid @RequestBody CreateCourseRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        Tenant tenant = new Tenant();
        tenant.setId(userDetails.getTenantId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(courseService.createCourse(request, userDetails.getId(), tenant));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR')")
    public ResponseEntity<CourseDto> updateCourse(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateCourseRequest request
    ) {
        return ResponseEntity.ok(courseService.updateCourse(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR')")
    public ResponseEntity<Void> deleteCourse(@PathVariable UUID id) {
        courseService.deleteCourse(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/publish")
    @PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR')")
    public ResponseEntity<CourseDto> publishCourse(@PathVariable UUID id) {
        return ResponseEntity.ok(courseService.publishCourse(id));
    }

    @PostMapping("/{id}/enroll")
    public ResponseEntity<EnrollmentDto> enrollUser(
            @PathVariable UUID id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        Tenant tenant = new Tenant();
        tenant.setId(userDetails.getTenantId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(enrollmentService.enrollUser(id, userDetails.getId(), tenant));
    }

    @PostMapping("/{courseId}/modules")
    @PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR')")
    public ResponseEntity<ModuleDto> addModule(
            @PathVariable UUID courseId,
            @Valid @RequestBody CreateModuleRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(courseService.addModule(courseId, request));
    }
}
