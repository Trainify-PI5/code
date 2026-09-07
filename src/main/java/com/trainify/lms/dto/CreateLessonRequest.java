package com.trainify.lms.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import java.util.UUID;

@Data
public class CreateLessonRequest {
    @NotBlank
    private String title;
    
    private String content;
    
    private UUID videoAssetId;
}
