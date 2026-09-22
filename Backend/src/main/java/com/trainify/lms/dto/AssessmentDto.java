package com.trainify.lms.dto;

import lombok.Data;
import java.util.List;
import java.util.UUID;

@Data
public class AssessmentDto {
    private UUID id;
    private String title;
    private Integer passingScore;
    private Integer maxAttempts;

    // Situacao do aluno nesta avaliacao
    private int attemptsUsed;
    private int attemptsRemaining;
    private boolean alreadyPassed;
    private Integer bestScore;

    private List<QuestionDto> questions;

    @Data
    public static class QuestionDto {
        private UUID id;
        private String text;
        private List<OptionDto> options;
    }

    @Data
    public static class OptionDto {
        private UUID id;
        private String text;
    }
}
