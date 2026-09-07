package com.trainify.lms.repositories;

import com.trainify.lms.domain.entities.LessonProgress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;
import java.util.List;

@Repository
public interface LessonProgressRepository extends JpaRepository<LessonProgress, UUID> {
    Optional<LessonProgress> findByEnrollmentIdAndLessonId(UUID enrollmentId, UUID lessonId);
    
    List<LessonProgress> findByEnrollmentId(UUID enrollmentId);
}
