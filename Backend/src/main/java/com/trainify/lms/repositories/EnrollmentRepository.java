package com.trainify.lms.repositories;

import com.trainify.lms.domain.entities.Enrollment;
import com.trainify.lms.domain.enums.EnrollmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface EnrollmentRepository extends JpaRepository<Enrollment, UUID> {
    Optional<Enrollment> findByUserIdAndCourseId(UUID userId, UUID courseId);
    boolean existsByCourseIdAndUserId(UUID courseId, UUID userId);
    java.util.List<Enrollment> findByUserId(UUID userId);

    // Contagens usadas pelos graficos do dashboard (AnalyticsService)
    long countByStatus(EnrollmentStatus status);
    long countByCourseId(UUID courseId);
    long countByCourseIdAndStatus(UUID courseId, EnrollmentStatus status);
    long countByEnrolledAtGreaterThanEqualAndEnrolledAtLessThan(Instant from, Instant to);
    long countByCompletedAtGreaterThanEqualAndCompletedAtLessThan(Instant from, Instant to);
}
