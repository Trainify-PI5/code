package com.trainify.lms.repositories;

import com.trainify.lms.domain.entities.Assessment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AssessmentRepository extends JpaRepository<Assessment, UUID> {
    Optional<Assessment> findByLessonId(UUID lessonId);

    List<Assessment> findByLessonIdIn(Collection<UUID> lessonIds);
}
