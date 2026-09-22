package com.trainify.lms.services;

import com.trainify.lms.domain.entities.Tenant;
import com.trainify.lms.domain.entities.User;
import com.trainify.lms.domain.enums.Role;
import com.trainify.lms.dto.CreateUserRequest;
import com.trainify.lms.repositories.TenantRepository;
import com.trainify.lms.repositories.UserRepository;
import com.trainify.lms.security.CustomUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class UserServiceRoleTest {

    private static final UUID TENANT = UUID.fromString("33333333-3333-3333-3333-333333333333");

    @Mock
    private UserRepository userRepository;

    @Mock
    private TenantRepository tenantRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserService userService;

    @AfterEach
    void limpaContexto() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void gestorNaoPodeCriarAdministrador() {
        // Arrange
        autentica(Role.MANAGER);

        // Act
        AccessDeniedException erro = assertThrows(AccessDeniedException.class,
                () -> userService.createUser(pedido("novo.admin@empresa.com", Role.ADMIN)));

        // Assert: nem chega a consultar ou gravar nada
        assertTrue(erro.getMessage().contains("ADMIN"));
        verify(userRepository, never()).save(org.mockito.ArgumentMatchers.any());
        verify(userRepository, never()).existsByEmailIgnoreCase(org.mockito.ArgumentMatchers.anyString());
    }

    @Test
    void gestorNaoPodeCriarSuperAdministrador() {
        autentica(Role.MANAGER);

        assertThrows(AccessDeniedException.class,
                () -> userService.createUser(pedido("outro@empresa.com", Role.SUPER_ADMIN)));
    }

    @Test
    void administradorNaoPodeCriarSuperAdministrador() {
        autentica(Role.ADMIN);

        assertThrows(AccessDeniedException.class,
                () -> userService.createUser(pedido("outro@empresa.com", Role.SUPER_ADMIN)));
    }

    @Test
    void perfisQueCadaUmPodeAtribuir() {
        assertEquals(Role.values().length, UserService.assignableRoles(Set.of("ROLE_SUPER_ADMIN")).size());

        Set<Role> doAdmin = UserService.assignableRoles(Set.of("ROLE_ADMIN"));
        assertTrue(doAdmin.contains(Role.ADMIN));
        assertFalse(doAdmin.contains(Role.SUPER_ADMIN));

        Set<Role> doGestor = UserService.assignableRoles(Set.of("ROLE_MANAGER"));
        assertEquals(Set.of(Role.INSTRUCTOR, Role.STUDENT), doGestor);

        assertTrue(UserService.assignableRoles(Set.of("ROLE_INSTRUCTOR")).isEmpty());
        assertTrue(UserService.assignableRoles(Set.of("ROLE_STUDENT")).isEmpty());
    }

    private CreateUserRequest pedido(String email, Role role) {
        CreateUserRequest request = new CreateUserRequest();
        request.setName("Fulano");
        request.setEmail(email);
        request.setPassword("Trainify@2026");
        request.setRole(role);
        return request;
    }

    private void autentica(Role role) {
        Tenant tenant = new Tenant();
        tenant.setId(TENANT);

        User user = new User();
        user.setId(UUID.randomUUID());
        user.setTenant(tenant);
        user.setEmail("usuario@empresa.com");
        user.setName("Usuario");
        user.setPasswordHash("hash");
        user.setRole(role);
        user.setIsActive(true);

        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(new CustomUserDetails(user), null, List.of()));
    }
}
