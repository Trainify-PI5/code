package com.trainify.lms.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RefreshTokenRequest {
    @NotBlank(message = "O token de refresh não pode ser vazio")
    private String refreshToken;
}
