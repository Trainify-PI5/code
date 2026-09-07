package com.trainify.lms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UploadCompleteRequest {
    @NotBlank
    private String key;
    @NotBlank
    private String filename;
    @NotBlank
    private String contentType;
    @NotNull
    private Long size;
}
