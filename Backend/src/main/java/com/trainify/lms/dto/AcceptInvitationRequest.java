package com.trainify.lms.dto;

import jakarta.validation.constraints.*;

public record AcceptInvitationRequest(
        @NotBlank @Pattern(regexp = "[a-f0-9]{64}") String token,
        @NotBlank @Size(min = 8, max = 72) String password) {}
