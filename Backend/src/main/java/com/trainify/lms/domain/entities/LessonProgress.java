package com.trainify.lms.domain.entities;

import com.trainify.lms.domain.enums.ProgressStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "lesson_progress")
@Getter
@Setter
public class LessonProgress extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "enrollment_id", nullable = false)
    private Enrollment enrollment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lesson_id", nullable = false)
    private Lesson lesson;

    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    private ProgressStatus status = ProgressStatus.NOT_STARTED;

    @Column(name = "watched_seconds")
    private Integer watchedSeconds = 0;

    @Column(name = "updated_at")
    private Instant updatedAt = Instant.now();
}
