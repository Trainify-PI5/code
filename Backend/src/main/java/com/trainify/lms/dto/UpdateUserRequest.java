package com.trainify.lms.dto;

import com.trainify.lms.domain.enums.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateUserRequest {
    @NotBlank
    private String name;
    
    @NotBlank
    @Email
    private String email;
    
    @NotNull
    private Role role;
    
    @NotNull
    private Boolean isActive;
}
