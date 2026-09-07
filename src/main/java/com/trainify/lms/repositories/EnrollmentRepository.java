package com.trainify.lms.repositories;

import com.trainify.lms.domain.entities.Enrollment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface EnrollmentRepository extends JpaRepository<Enrollment, UUID> {
    Optional<Enrollment> findByUserIdAndCourseId(UUID userId, UUID courseId);
    boolean existsByCourseIdAndUserId(UUID courseId, UUID userId);
    java.util.List<Enrollment> findByUserId(UUID userId);
}
