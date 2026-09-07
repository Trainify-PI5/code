package com.trainify.lms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.util.List;

@Data
public class CreateAssessmentRequest {
    @NotBlank
    private String title;
    
    @NotNull
    private Integer passingScore;
    
    private List<QuestionRequest> questions;

    @Data
    public static class QuestionRequest {
        @NotBlank
        private String text;
        
        private List<OptionRequest> options;
    }

    @Data
    public static class OptionRequest {
        @NotBlank
        private String text;
        
        @NotNull
        private Boolean isCorrect;
    }
}
