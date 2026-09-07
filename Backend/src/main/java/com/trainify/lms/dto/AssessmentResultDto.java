package com.trainify.lms.dto;

import lombok.Data;

@Data
public class AssessmentResultDto {
    private int score;
    private int totalQuestions;
    private boolean passed;
    private int passingScore;
}
