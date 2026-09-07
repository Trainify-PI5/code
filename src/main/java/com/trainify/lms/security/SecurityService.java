package com.trainify.lms.security;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service("securityService")
public class SecurityService {
    public boolean isCurrentUser(UUID id) {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof CustomUserDetails) {
            return ((CustomUserDetails) principal).getId().equals(id);
        }
        return false;
    }
}
