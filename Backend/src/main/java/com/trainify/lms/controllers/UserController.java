package com.trainify.lms.controllers;

import com.trainify.lms.dto.CreateUserRequest;
import com.trainify.lms.dto.UpdateUserRequest;
import com.trainify.lms.dto.UserDto;
import com.trainify.lms.services.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MANAGER')")
    public ResponseEntity<List<UserDto>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MANAGER')")
    public ResponseEntity<UserDto> getUserById(@PathVariable UUID id) {
        return ResponseEntity.ok(userService.getUserById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MANAGER')")
    public ResponseEntity<UserDto> createUser(@Valid @RequestBody CreateUserRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(userService.createUser(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MANAGER')")
    public ResponseEntity<UserDto> updateUser(@PathVariable UUID id, @Valid @RequestBody UpdateUserRequest request) {
        return ResponseEntity.ok(userService.updateUser(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Void> deleteUser(@PathVariable UUID id) {
        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/avatar")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MANAGER') or @securityService.isCurrentUser(#id)")
    public ResponseEntity<UserDto> updateAvatar(@PathVariable UUID id, @RequestBody java.util.Map<String, String> body) {
        // avatarKey: arquivo enviado para o Storage. avatarUrl: endereco externo pronto.
        String avatarKey = body.get("avatarKey");
        String stored = avatarKey != null && !avatarKey.isBlank()
                ? com.trainify.lms.services.AvatarUrlResolver.storedValueForKey(avatarKey)
                : body.get("avatarUrl");

        return ResponseEntity.ok(userService.updateAvatar(id, stored));
    }

    @PutMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<UserDto> updateProfile(@Valid @RequestBody com.trainify.lms.dto.UpdateProfileRequest request) {
        return ResponseEntity.ok(userService.updateProfile(request));
    }

    @PatchMapping("/me/password")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> updatePassword(@Valid @RequestBody com.trainify.lms.dto.UpdatePasswordRequest request) {
        userService.updatePassword(request.getCurrentPassword(), request.getNewPassword());
        return ResponseEntity.noContent().build();
    }
}
