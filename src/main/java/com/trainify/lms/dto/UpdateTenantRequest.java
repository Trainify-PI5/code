package com.trainify.lms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateTenantRequest {
    @NotBlank
    private String name;
    
    @NotBlank
    private String domain;

    private String primaryColor;
    private String secondaryColor;
    private String logoUrl;
}
