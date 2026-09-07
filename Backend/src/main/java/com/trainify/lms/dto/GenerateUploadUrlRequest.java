package com.trainify.lms.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class GenerateUploadUrlRequest {
    @NotBlank
    private String filename;
    @NotBlank
    private String contentType;
}
