package com.trainify.lms.services;

import com.trainify.lms.domain.entities.Enrollment;
import com.trainify.lms.domain.entities.Lesson;
import com.trainify.lms.domain.entities.LessonProgress;
import com.trainify.lms.domain.enums.ProgressStatus;
import com.trainify.lms.dto.HeartbeatRequest;
import com.trainify.lms.repositories.EnrollmentRepository;
import com.trainify.lms.repositories.LessonProgressRepository;
import com.trainify.lms.repositories.LessonRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProgressService {

    private final LessonProgressRepository lessonProgressRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final LessonRepository lessonRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional(readOnly = true)
    public com.trainify.lms.domain.entities.LessonProgress getLessonProgress(UUID enrollmentId, UUID lessonId, UUID userId) {
        Enrollment enrollment = enrollmentRepository.findById(enrollmentId)
                .orElseThrow(() -> new IllegalArgumentException("Enrollment not found"));

        if (!enrollment.getUser().getId().equals(userId)) {
            throw new org.springframework.security.access.AccessDeniedException("Enrollment does not belong to user");
        }

        return lessonProgressRepository.findByEnrollmentIdAndLessonId(enrollmentId, lessonId)
                .orElse(null);
    }

    @Transactional
    public void recordHeartbeat(UUID enrollmentId, UUID lessonId, HeartbeatRequest request, UUID userId) {
        Enrollment enrollment = enrollmentRepository.findById(enrollmentId)
                .orElseThrow(() -> new IllegalArgumentException("Enrollment not found"));

        if (!enrollment.getUser().getId().equals(userId)) {
            throw new org.springframework.security.access.AccessDeniedException("Enrollment does not belong to user");
        }

        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new IllegalArgumentException("Lesson not found"));

        LessonProgress progress = lessonProgressRepository.findByEnrollmentIdAndLessonId(enrollmentId, lessonId)
                .orElseGet(() -> {
                    LessonProgress newProgress = new LessonProgress();
                    newProgress.setTenant(enrollment.getTenant());
                    newProgress.setEnrollment(enrollment);
                    newProgress.setLesson(lesson);
                    newProgress.setStatus(ProgressStatus.NOT_STARTED);
                    return newProgress;
                });

        progress.setWatchedSeconds(request.getWatchedSeconds());
        progress.setUpdatedAt(Instant.now());

        if (request.getWatchedSeconds() > 0 && progress.getStatus() == ProgressStatus.NOT_STARTED) {
            progress.setStatus(ProgressStatus.IN_PROGRESS);
        }

        if (request.getIsCompleted() && progress.getStatus() != ProgressStatus.COMPLETED) {
            progress.setStatus(ProgressStatus.COMPLETED);
        }

        lessonProgressRepository.save(progress);

        // Dispara evento para recalcular o progresso total do curso (Async)
        eventPublisher.publishEvent(new EnrollmentProgressEvent(enrollmentId));
    }
}
