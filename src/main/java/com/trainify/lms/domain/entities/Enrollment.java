package com.trainify.lms.domain.entities;

import com.trainify.lms.domain.enums.EnrollmentStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "enrollments")
@Getter
@Setter
public class Enrollment extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    @Column(name = "progress_percentage")
    private Integer progressPercentage = 0;

    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    private EnrollmentStatus status = EnrollmentStatus.IN_PROGRESS;

    @Column(name = "enrolled_at", updatable = false)
    private Instant enrolledAt = Instant.now();

    @Column(name = "completed_at")
    private Instant completedAt;
}
