package com.trainify.lms.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateTenantRequest {
    @NotBlank
    private String name;
    
    @NotBlank
    private String domain;
}
