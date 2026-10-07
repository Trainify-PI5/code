package com.trainify.lms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateTenantRequest {
    @NotBlank
    @Size(max = 150)
    private String name;
    
    @Size(max = 100)
    private String domain;

    @jakarta.validation.constraints.Pattern(regexp = "^#[0-9a-fA-F]{6}$")
    private String primaryColor;
    @jakarta.validation.constraints.Pattern(regexp = "^#[0-9a-fA-F]{6}$")
    private String secondaryColor;
    private String logoUrl;
    private String logoKey;
}
