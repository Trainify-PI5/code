package com.trainify.lms.dto;

import com.trainify.lms.domain.enums.Role;
import jakarta.validation.constraints.*;
import java.util.UUID;

public record InviteUserRequest(
        @NotNull UUID requestId,
        @NotBlank @Size(max = 100) String name,
        @NotBlank @Email @Size(max = 150) String email,
        @NotNull Role role) {}
