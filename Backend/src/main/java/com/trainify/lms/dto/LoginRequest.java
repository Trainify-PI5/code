package com.trainify.lms.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LoginRequest {
    @NotBlank
    @Email
    private String email;

    @NotBlank
    private String password;

    /** Preenchido só quando o e-mail tem conta em mais de uma empresa. */
    private java.util.UUID tenantId;
}
