package com.trainify.lms.services;

import com.trainify.lms.domain.entities.User;
import com.trainify.lms.domain.entities.Tenant;
import com.trainify.lms.dto.CreateUserRequest;
import com.trainify.lms.dto.UpdateUserRequest;
import com.trainify.lms.dto.UserDto;
import com.trainify.lms.domain.enums.Role;
import com.trainify.lms.repositories.TenantRepository;
import com.trainify.lms.repositories.UserRepository;
import com.trainify.lms.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityNotFoundException;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final TenantRepository tenantRepository;
    private final PasswordEncoder passwordEncoder;

    /** Mesma normalizacao do login, que compara sem diferenciar maiusculas. */
    private static String normalizeEmail(String email) {
        return email.trim().toLowerCase(java.util.Locale.ROOT);
    }

    private CustomUserDetails getCurrentUser() {
        return (CustomUserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }

    /**
     * Perfis que cada um pode atribuir. Ninguem pode criar alguem com mais poder que
     * si proprio: antes um gestor conseguia criar um administrador e se promover.
     */
    static Set<Role> assignableRoles(Set<String> authorities) {
        if (authorities.contains("ROLE_SUPER_ADMIN")) {
            return EnumSet.allOf(Role.class);
        }
        if (authorities.contains("ROLE_ADMIN")) {
            return EnumSet.of(Role.ADMIN, Role.MANAGER, Role.INSTRUCTOR, Role.STUDENT);
        }
        if (authorities.contains("ROLE_MANAGER")) {
            return EnumSet.of(Role.INSTRUCTOR, Role.STUDENT);
        }
        return EnumSet.noneOf(Role.class);
    }

    private void checkCanAssignRole(Role role) {
        CustomUserDetails currentUser = getCurrentUser();
        Set<String> authorities = currentUser.getAuthorities().stream()
                .map(a -> a.getAuthority())
                .collect(Collectors.toSet());

        if (role == null || !assignableRoles(authorities).contains(role)) {
            throw new AccessDeniedException("Seu perfil nao pode atribuir o perfil " + role);
        }
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
        checkCanAssignRole(request.getRole());

        if (userRepository.existsByEmailIgnoreCase(request.getEmail().trim())) {
            throw new RuntimeException("Email already exists");
        }

        CustomUserDetails currentUser = getCurrentUser();
        Tenant tenant = tenantRepository.findById(currentUser.getTenantId())
                .orElseThrow(() -> new EntityNotFoundException("Tenant not found"));

        User user = new User();
        user.setTenant(tenant);
        user.setName(request.getName());
        user.setEmail(normalizeEmail(request.getEmail()));
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

        checkCanAssignRole(request.getRole());
        // Nem alterar alguem que ja tem um perfil acima do seu
        checkCanAssignRole(user.getRole());

        if (!user.getEmail().equalsIgnoreCase(request.getEmail())
                && userRepository.existsByEmailIgnoreCase(request.getEmail().trim())) {
            throw new RuntimeException("Email already exists");
        }

        user.setName(request.getName());
        user.setEmail(normalizeEmail(request.getEmail()));
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

        if (!user.getEmail().equalsIgnoreCase(request.getEmail())
                && userRepository.existsByEmailIgnoreCase(request.getEmail().trim())) {
            throw new RuntimeException("Email already exists");
        }

        user.setName(request.getName());
        user.setEmail(normalizeEmail(request.getEmail()));
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
