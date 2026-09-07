package com.trainify.lms.repositories;

import com.trainify.lms.domain.entities.Lesson;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface LessonRepository extends JpaRepository<Lesson, UUID> {
    List<Lesson> findByModuleIdOrderByOrderIndexAsc(UUID moduleId);
    
    long countByModuleCourseId(UUID courseId);
}
