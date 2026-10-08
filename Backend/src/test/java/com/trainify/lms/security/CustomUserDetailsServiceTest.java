package com.trainify.lms.security;

import com.trainify.lms.domain.entities.Tenant;
import com.trainify.lms.domain.entities.User;
import com.trainify.lms.domain.enums.Role;
import com.trainify.lms.repositories.UserRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * O mesmo e-mail pode ter conta em empresas diferentes. Quem chama informa a
 * empresa no formato email#idDaEmpresa.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class CustomUserDetailsServiceTest {

    private static final UUID EMPRESA_A = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID EMPRESA_B = UUID.fromString("22222222-2222-2222-2222-222222222222");

    @Mock private UserRepository userRepository;
    @Mock private EntityManager entityManager;
    @Mock private Query query;

    @InjectMocks private CustomUserDetailsService service;

    @BeforeEach
    void setUp() {
        when(entityManager.createNativeQuery(anyString())).thenReturn(query);
    }

    private User conta(UUID tenantId, String nomeDaEmpresa) {
        Tenant tenant = new Tenant();
        tenant.setId(tenantId);
        tenant.setName(nomeDaEmpresa);

        User user = new User();
        user.setId(UUID.randomUUID());
        user.setTenant(tenant);
        user.setEmail("consultor@parceiro.com");
        user.setName("Consultor");
        user.setPasswordHash("hash");
        user.setRole(Role.INSTRUCTOR);
        user.setIsActive(true);
        return user;
    }

    @Test
    void comUmaContaSoOEmailBasta() {
        when(userRepository.findAllByEmailIgnoreCaseAndIsActiveTrue("consultor@parceiro.com"))
                .thenReturn(List.of(conta(EMPRESA_A, "Empresa A")));

        CustomUserDetails detalhes = (CustomUserDetails) service.loadUserByUsername("consultor@parceiro.com");

        assertEquals(EMPRESA_A, detalhes.getTenantId());
    }

    @Test
    void comDuasContasOEmailSozinhoNaoServe() {
        when(userRepository.findAllByEmailIgnoreCaseAndIsActiveTrue("consultor@parceiro.com"))
                .thenReturn(List.of(conta(EMPRESA_A, "Empresa A"), conta(EMPRESA_B, "Empresa B")));

        UsernameNotFoundException erro = assertThrows(UsernameNotFoundException.class,
                () -> service.loadUserByUsername("consultor@parceiro.com"));

        assertTrue(erro.getMessage().contains("mais de uma empresa"));
    }

    @Test
    void comAEmpresaInformadaEncontraAContaCerta() {
        when(userRepository.findByEmailIgnoreCaseAndTenantIdAndIsActiveTrue("consultor@parceiro.com", EMPRESA_B))
                .thenReturn(Optional.of(conta(EMPRESA_B, "Empresa B")));

        CustomUserDetails detalhes = (CustomUserDetails) service.loadUserByUsername(
                CustomUserDetailsService.usernameFor("consultor@parceiro.com", EMPRESA_B));

        assertEquals(EMPRESA_B, detalhes.getTenantId());
        verify(userRepository, never()).findAllByEmailIgnoreCaseAndIsActiveTrue(anyString());
    }

    @Test
    void contaInexistenteNaEmpresaInformada() {
        when(userRepository.findByEmailIgnoreCaseAndTenantIdAndIsActiveTrue(anyString(), any()))
                .thenReturn(Optional.empty());

        assertThrows(UsernameNotFoundException.class, () -> service.loadUserByUsername(
                CustomUserDetailsService.usernameFor("consultor@parceiro.com", EMPRESA_A)));
    }

    @Test
    void empresaComFormatoInvalidoNaoDerruba() {
        assertThrows(UsernameNotFoundException.class,
                () -> service.loadUserByUsername("consultor@parceiro.com#nao-e-um-id"));
    }

    @Test
    void semEmpresaOFormatoContinuaSendoSoOEmail() {
        assertEquals("pessoa@empresa.com", CustomUserDetailsService.usernameFor("pessoa@empresa.com", null));
    }
}
