package com.trainify.lms.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateCourseRequest {
    @NotBlank
    private String title;
    
    @NotBlank
    private String description;
}
