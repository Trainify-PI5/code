package com.trainify.lms.dto;

import lombok.Data;

import java.time.Instant;
import java.util.UUID;

/** Uma tentativa ja feita, usada no historico do aluno e nos resultados do curso. */
@Data
public class AssessmentAttemptDto {
    private UUID id;
    private UUID lessonId;
    private String lessonTitle;
    private UUID studentId;
    private String studentName;
    private int attemptNumber;
    private int score;
    private int passingScore;
    private boolean passed;
    private Instant createdAt;
}
