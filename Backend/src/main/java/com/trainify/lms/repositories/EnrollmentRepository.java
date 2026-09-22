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

    // Contagens usadas pelos graficos do dashboard (AnalyticsService).
    // Todas filtram pela empresa: o isolamento por tenant e feito na aplicacao.
    long countByTenantId(UUID tenantId);
    long countByTenantIdAndStatus(UUID tenantId, EnrollmentStatus status);
    long countByTenantIdAndCourseId(UUID tenantId, UUID courseId);
    long countByTenantIdAndCourseIdAndStatus(UUID tenantId, UUID courseId, EnrollmentStatus status);
    long countByTenantIdAndEnrolledAtGreaterThanEqualAndEnrolledAtLessThan(UUID tenantId, Instant from, Instant to);
    long countByTenantIdAndCompletedAtGreaterThanEqualAndCompletedAtLessThan(UUID tenantId, Instant from, Instant to);
}
