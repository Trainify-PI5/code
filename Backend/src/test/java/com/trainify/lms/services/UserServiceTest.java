package com.trainify.lms.services;

import com.trainify.lms.domain.entities.Tenant;
import com.trainify.lms.domain.entities.User;
import com.trainify.lms.domain.enums.Role;
import com.trainify.lms.dto.CreateUserRequest;
import com.trainify.lms.dto.UpdateUserRequest;
import com.trainify.lms.dto.UserDto;
import com.trainify.lms.repositories.TenantRepository;
import com.trainify.lms.repositories.UserRepository;
import com.trainify.lms.security.CustomUserDetails;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private TenantRepository tenantRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private SecurityContext securityContext;

    @Mock
    private Authentication authentication;

    @InjectMocks
    private UserService userService;

    private User mockUser;
    private Tenant mockTenant;
    private CustomUserDetails mockUserDetails;
    private UUID userId;
    private UUID tenantId;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        tenantId = UUID.randomUUID();

        mockTenant = new Tenant();
        mockTenant.setId(tenantId);
        mockTenant.setName("Test Tenant");

        mockUser = new User();
        mockUser.setId(userId);
        mockUser.setName("Test User");
        mockUser.setEmail("test@test.com");
        mockUser.setRole(Role.STUDENT);
        mockUser.setIsActive(true);
        mockUser.setTenant(mockTenant);

        mockUserDetails = mock(CustomUserDetails.class);
        setupSecurityContext();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private void setupSecurityContext() {
        SecurityContextHolder.setContext(securityContext);
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(mockUserDetails);
        lenient().when(mockUserDetails.getTenantId()).thenReturn(tenantId);
    }

    @Test
    void getAllUsers_Success_ReturnsUserDtoList() {
        // Arrange
        when(userRepository.findByTenantIdAndIsActiveTrue(tenantId)).thenReturn(List.of(mockUser));

        // Act
        List<UserDto> result = userService.getAllUsers();

        // Assert
        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals(mockUser.getEmail(), result.get(0).getEmail());
        verify(userRepository).findByTenantIdAndIsActiveTrue(tenantId);
    }

    @Test
    void getUserById_UserExists_ReturnsUserDto() {
        // Arrange
        when(userRepository.findByIdAndTenantId(userId, tenantId)).thenReturn(Optional.of(mockUser));

        // Act
        UserDto result = userService.getUserById(userId);

        // Assert
        assertNotNull(result);
        assertEquals(userId, result.getId());
        assertEquals("test@test.com", result.getEmail());
        verify(userRepository).findByIdAndTenantId(userId, tenantId);
    }

    @Test
    void getUserById_UserNotFound_ThrowsException() {
        // Arrange
        when(userRepository.findByIdAndTenantId(userId, tenantId)).thenReturn(Optional.empty());

        // Act & Assert
        EntityNotFoundException exception = assertThrows(EntityNotFoundException.class, () -> userService.getUserById(userId));
        assertEquals("User not found or inactive", exception.getMessage());
        verify(userRepository).findByIdAndTenantId(userId, tenantId);
    }

    @Test
    void createUser_Success_ReturnsCreatedUserDto() {
        // Arrange
        setupSecurityContext();
        CreateUserRequest request = new CreateUserRequest();
        request.setName("New User");
        request.setEmail("new@test.com");
        request.setPassword("password");
        request.setRole(Role.STUDENT);

        when(userRepository.existsByEmail(request.getEmail())).thenReturn(false);
        when(tenantRepository.findById(tenantId)).thenReturn(Optional.of(mockTenant));
        when(passwordEncoder.encode(request.getPassword())).thenReturn("hashed-password");
        
        User savedUser = new User();
        savedUser.setId(UUID.randomUUID());
        savedUser.setName(request.getName());
        savedUser.setEmail(request.getEmail());
        savedUser.setTenant(mockTenant);
        savedUser.setRole(request.getRole());
        savedUser.setIsActive(true);

        when(userRepository.save(any(User.class))).thenReturn(savedUser);

        // Act
        UserDto result = userService.createUser(request);

        // Assert
        assertNotNull(result);
        assertEquals(request.getEmail(), result.getEmail());
        assertEquals(request.getName(), result.getName());
        
        verify(userRepository).existsByEmail(request.getEmail());
        verify(tenantRepository).findById(tenantId);
        verify(passwordEncoder).encode(request.getPassword());
        verify(userRepository).save(any(User.class));
    }

    @Test
    void createUser_EmailAlreadyExists_ThrowsException() {
        // Arrange
        setupSecurityContext();
        CreateUserRequest request = new CreateUserRequest();
        request.setName("New User");
        request.setEmail("existing@test.com");
        request.setPassword("password");
        request.setRole(Role.STUDENT);
        when(userRepository.existsByEmail(request.getEmail())).thenReturn(true);

        // Act & Assert
        RuntimeException exception = assertThrows(RuntimeException.class, () -> userService.createUser(request));
        assertEquals("Email already exists", exception.getMessage());

        verify(userRepository).existsByEmail(request.getEmail());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void updateUser_Success_ReturnsUpdatedUserDto() {
        // Arrange
        UpdateUserRequest request = new UpdateUserRequest();
        request.setName("Updated Name");
        request.setEmail("updated@test.com");
        request.setRole(Role.ADMIN);
        request.setIsActive(false);
        when(userRepository.findByIdAndTenantId(userId, tenantId)).thenReturn(Optional.of(mockUser));
        when(userRepository.existsByEmail(request.getEmail())).thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        UserDto result = userService.updateUser(userId, request);

        // Assert
        assertNotNull(result);
        assertEquals("Updated Name", result.getName());
        assertEquals("updated@test.com", result.getEmail());
        assertEquals(Role.ADMIN, result.getRole());
        assertFalse(result.getIsActive());

        verify(userRepository).findByIdAndTenantId(userId, tenantId);
        verify(userRepository).existsByEmail(request.getEmail());
        verify(userRepository).save(any(User.class));
    }

    @Test
    void deleteUser_Success_DeletesUser() {
        // Arrange
        when(userRepository.findByIdAndTenantId(userId, tenantId)).thenReturn(Optional.of(mockUser));

        // Act
        userService.deleteUser(userId);

        // Assert
        verify(userRepository).findByIdAndTenantId(userId, tenantId);
        verify(userRepository).save(mockUser);
    }
}
