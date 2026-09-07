package com.trainify.lms.dto;

import com.trainify.lms.domain.enums.EnrollmentStatus;
import lombok.Data;

import java.util.UUID;
import java.time.Instant;

@Data
public class EnrollmentDto {
    private UUID id;
    private UserDto user;
    private CourseDto course;
    private EnrollmentStatus status;
    private Instant enrolledAt;
    private Instant completedAt;
}
