package com.trainify.lms.repositories;

import com.trainify.lms.domain.entities.UserAssessmentAnswer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface UserAssessmentAnswerRepository extends JpaRepository<UserAssessmentAnswer, UUID> {

    /** Questoes que esta pessoa realmente errou nesta avaliacao. */
    @Query("select resposta.question.id from UserAssessmentAnswer resposta "
            + "where resposta.enrollment.user.id = :userId "
            + "and resposta.question.assessment.id = :assessmentId "
            + "and resposta.isCorrect = false")
    List<UUID> idsDasQuestoesErradas(@Param("userId") UUID userId, @Param("assessmentId") UUID assessmentId);
}
