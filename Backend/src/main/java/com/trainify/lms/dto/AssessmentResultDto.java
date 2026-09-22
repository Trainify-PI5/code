package com.trainify.lms.dto;

import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
public class AssessmentResultDto {
    private int score;
    private int totalQuestions;
    private int correctAnswers;
    private boolean passed;
    private int passingScore;

    // Controle de tentativas
    private int attemptNumber;
    private int maxAttempts;
    private int attemptsRemaining;

    // Revisao: o que o aluno marcou e qual era a resposta certa
    private List<QuestionResultDto> questions;

    @Data
    public static class QuestionResultDto {
        private UUID questionId;
        private String text;
        private UUID selectedOptionId;
        private String selectedOptionText;
        private UUID correctOptionId;
        private String correctOptionText;
        private boolean correct;
    }
}
