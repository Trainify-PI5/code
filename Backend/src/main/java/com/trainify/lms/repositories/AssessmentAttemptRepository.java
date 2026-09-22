package com.trainify.lms.repositories;

import com.trainify.lms.domain.entities.AssessmentAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AssessmentAttemptRepository extends JpaRepository<AssessmentAttempt, UUID> {

    List<AssessmentAttempt> findByEnrollmentIdAndAssessmentIdOrderByAttemptNumberAsc(UUID enrollmentId, UUID assessmentId);

    boolean existsByEnrollmentIdAndAssessmentIdAndPassedTrue(UUID enrollmentId, UUID assessmentId);

    boolean existsByAssessmentId(UUID assessmentId);

    // Resultados de todas as avaliacoes de um curso, para o instrutor e o gestor
    List<AssessmentAttempt> findByAssessmentLessonModuleCourseIdOrderByCreatedAtDesc(UUID courseId);

    List<AssessmentAttempt> findByTenantId(UUID tenantId);
}
