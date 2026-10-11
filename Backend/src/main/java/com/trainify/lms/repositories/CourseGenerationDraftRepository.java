package com.trainify.lms.repositories;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.trainify.lms.domain.entities.CourseGenerationDraft;

@Repository
public interface CourseGenerationDraftRepository extends JpaRepository<CourseGenerationDraft, UUID> {
}
