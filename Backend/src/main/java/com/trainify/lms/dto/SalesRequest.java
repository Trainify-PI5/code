package com.trainify.lms.dto;

import jakarta.validation.constraints.*;
import java.util.UUID;

public record SalesRequest(
        @NotNull UUID id,
        @NotBlank @Size(max = 80) String firstName,
        @NotBlank @Size(max = 100) String lastName,
        @NotBlank @Email @Size(max = 254) String email,
        @NotBlank @Pattern(regexp = "\\+[1-9][0-9]{7,14}") String phone,
        @NotBlank @Size(max = 160) String company,
        @NotBlank @Size(max = 100) String jobTitle,
        @NotBlank @Pattern(regexp = "1-10|11-50|51-200|201-500|501-1000|1001\\+") String companySize,
        @Size(max = 2000) String message,
        @AssertTrue boolean consent,
        @Size(max = 0) String website) {
    public SalesRequest {
        firstName = trim(firstName);
        lastName = trim(lastName);
        email = trim(email);
        company = trim(company);
        jobTitle = trim(jobTitle);
        message = trim(message);
    }

    private static String trim(String value) { return value == null ? null : value.trim(); }
}
