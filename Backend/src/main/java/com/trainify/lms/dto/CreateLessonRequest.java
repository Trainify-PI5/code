package com.trainify.lms.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import java.util.UUID;

@Data
public class CreateLessonRequest {
    @NotBlank
    private String title;
    
    private String content;

    @jakarta.validation.constraints.Pattern(regexp = "VIDEO|DOCUMENT|ARTICLE|QUIZ")
    private String lessonType;
    
    private UUID videoAssetId;
}
