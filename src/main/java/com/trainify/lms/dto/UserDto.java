package com.trainify.lms.dto;

import com.trainify.lms.domain.enums.Role;
import lombok.Data;
import java.util.UUID;

@Data
public class UserDto {
    private UUID id;
    private String name;
    private String email;
    private Role role;
    private String avatar;
    private Boolean isActive;
    private UUID tenantId;
}
