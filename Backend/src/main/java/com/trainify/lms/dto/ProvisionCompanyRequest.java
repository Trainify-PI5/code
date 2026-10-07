package com.trainify.lms.dto;

import jakarta.validation.constraints.*;
import java.util.UUID;

public record ProvisionCompanyRequest(
        @NotNull UUID requestId,
        @NotBlank @Size(max = 150) String name,
        @NotBlank @Size(max = 100) String adminName,
        @NotBlank @Email @Size(max = 150) String adminEmail) {}
