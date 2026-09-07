package com.trainify.lms.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateCourseRequest {
    @NotBlank
    private String title;
    
    @NotBlank
    private String description;
}
