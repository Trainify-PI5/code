package com.trainify.lms.services;

import com.trainify.lms.domain.entities.Enrollment;
import com.trainify.lms.domain.entities.LessonProgress;
import com.trainify.lms.domain.enums.EnrollmentStatus;
import com.trainify.lms.domain.enums.ProgressStatus;
import com.trainify.lms.repositories.EnrollmentRepository;
import com.trainify.lms.repositories.LessonProgressRepository;
import com.trainify.lms.repositories.LessonRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class EnrollmentProgressEventListener {

    private final EnrollmentRepository enrollmentRepository;
    private final LessonProgressRepository lessonProgressRepository;
    private final LessonRepository lessonRepository;
    private final CertificationService certificationService;

    @Async
    @EventListener
    @Transactional
    public void handleEnrollmentProgressEvent(EnrollmentProgressEvent event) {
        UUID enrollmentId = event.getEnrollmentId();
        
        Enrollment enrollment = enrollmentRepository.findById(enrollmentId).orElse(null);
        if (enrollment == null) return;
        
        long totalLessons = lessonRepository.countByModuleCourseId(enrollment.getCourse().getId());
        
        if (totalLessons == 0) return;

        List<LessonProgress> progresses = lessonProgressRepository.findByEnrollmentId(enrollmentId);
        
        long completedLessons = progresses.stream()
                .filter(p -> p.getStatus() == ProgressStatus.COMPLETED)
                .count();
                
        double percentage = ((double) completedLessons / totalLessons) * 100.0;
        int progressPercentage = (int) Math.round(percentage);
        
        enrollment.setProgressPercentage(progressPercentage);
        
        if (progressPercentage >= 100 && enrollment.getStatus() != EnrollmentStatus.COMPLETED) {
            enrollment.setStatus(EnrollmentStatus.COMPLETED);
            enrollment.setCompletedAt(Instant.now());
            log.info("Enrollment {} has been COMPLETED", enrollmentId);
            
            // Generate certification automatically
            certificationService.issueCertification(enrollment.getUser(), enrollment.getCourse());
            log.info("Certification issued for user {} and course {}", enrollment.getUser().getId(), enrollment.getCourse().getId());
        }
        
        enrollmentRepository.save(enrollment);
    }
}
