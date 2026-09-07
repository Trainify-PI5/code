package com.trainify.lms.dto;

import com.trainify.lms.domain.enums.MediaProvider;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateExternalMediaRequest {

    @NotNull(message = "Provider is required")
    private MediaProvider provider;

    @NotBlank(message = "External URL is required")
    private String url;
}
