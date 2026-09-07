package com.trainify.lms.services;

import com.trainify.lms.domain.entities.User;
import com.trainify.lms.domain.entities.Tenant;
import com.trainify.lms.dto.CreateUserRequest;
import com.trainify.lms.dto.UpdateUserRequest;
import com.trainify.lms.dto.UserDto;
import com.trainify.lms.repositories.TenantRepository;
import com.trainify.lms.repositories.UserRepository;
import com.trainify.lms.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityNotFoundException;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final TenantRepository tenantRepository;
    private final PasswordEncoder passwordEncoder;

    private CustomUserDetails getCurrentUser() {
        return (CustomUserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }

    @Transactional(readOnly = true)
    public List<UserDto> getAllUsers() {
        CustomUserDetails currentUser = getCurrentUser();
        return userRepository.findByTenantIdAndIsActiveTrue(currentUser.getTenantId()).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public UserDto getUserById(UUID id) {
        CustomUserDetails currentUser = getCurrentUser();
        return userRepository.findByIdAndTenantId(id, currentUser.getTenantId())
                .filter(User::getIsActive)
                .map(this::mapToDto)
                .orElseThrow(() -> new EntityNotFoundException("User not found or inactive"));
    }

    @Transactional
    public UserDto createUser(CreateUserRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already exists");
        }

        CustomUserDetails currentUser = getCurrentUser();
        Tenant tenant = tenantRepository.findById(currentUser.getTenantId())
                .orElseThrow(() -> new EntityNotFoundException("Tenant not found"));

        User user = new User();
        user.setTenant(tenant);
        user.setName(request.getName());
        user.setEmail(request.getEmail());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setRole(request.getRole());
        user.setIsActive(true);

        return mapToDto(userRepository.save(user));
    }

    @Transactional
    public UserDto updateUser(UUID id, UpdateUserRequest request) {
        CustomUserDetails currentUser = getCurrentUser();
        User user = userRepository.findByIdAndTenantId(id, currentUser.getTenantId())
                .orElseThrow(() -> new EntityNotFoundException("User not found or access denied"));

        if (!user.getEmail().equals(request.getEmail()) && userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already exists");
        }

        user.setName(request.getName());
        user.setEmail(request.getEmail());
        user.setRole(request.getRole());
        user.setIsActive(request.getIsActive());

        return mapToDto(userRepository.save(user));
    }

    @Transactional
    public void deleteUser(UUID id) {
        CustomUserDetails currentUser = getCurrentUser();
        User user = userRepository.findByIdAndTenantId(id, currentUser.getTenantId())
                .orElseThrow(() -> new EntityNotFoundException("User not found or access denied"));
        
        // Exclusão Lógica
        user.setIsActive(false);
        userRepository.save(user);
    }

    @Transactional
    public UserDto updateAvatar(UUID id, String avatarUrl) {
        CustomUserDetails currentUser = getCurrentUser();
        User user = userRepository.findByIdAndTenantId(id, currentUser.getTenantId())
                .orElseThrow(() -> new EntityNotFoundException("User not found or access denied"));
        user.setAvatar(avatarUrl);
        return mapToDto(userRepository.save(user));
    }

    @Transactional
    public UserDto updateProfile(com.trainify.lms.dto.UpdateProfileRequest request) {
        CustomUserDetails currentUser = getCurrentUser();
        User user = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new EntityNotFoundException("User not found"));

        if (!user.getEmail().equals(request.getEmail()) && userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already exists");
        }

        user.setName(request.getName());
        user.setEmail(request.getEmail());
        if (request.getAvatar() != null) {
            user.setAvatar(request.getAvatar());
        }

        return mapToDto(userRepository.save(user));
    }

    @Transactional
    public void updatePassword(String newPassword) {
        CustomUserDetails currentUser = getCurrentUser();
        User user = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new EntityNotFoundException("User not found"));
        
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    private UserDto mapToDto(User user) {
        UserDto dto = new UserDto();
        dto.setId(user.getId());
        dto.setName(user.getName());
        dto.setEmail(user.getEmail());
        dto.setRole(user.getRole());
        dto.setAvatar(user.getAvatar());
        dto.setIsActive(user.getIsActive());
        dto.setTenantId(user.getTenant().getId());
        return dto;
    }
}
