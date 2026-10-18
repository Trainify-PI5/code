package com.trainify.lms.repositories;

import com.trainify.lms.domain.entities.UserAssessmentAnswer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface UserAssessmentAnswerRepository extends JpaRepository<UserAssessmentAnswer, UUID> {
}
