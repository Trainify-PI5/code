package com.trainify.lms.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateProfileRequest {
    @NotBlank
    @Size(max = 100)
    private String name;
    
    @NotBlank
    @Email
    private String email;
    
    private String avatar;

    @Size(max = 1000)
    private String bio;
}
