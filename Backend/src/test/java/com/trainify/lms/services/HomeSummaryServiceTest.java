package com.trainify.lms.services;

import com.trainify.lms.domain.entities.Tenant;
import com.trainify.lms.domain.entities.User;
import com.trainify.lms.domain.enums.Role;
import com.trainify.lms.repositories.*;
import com.trainify.lms.security.CustomUserDetails;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * Antes a tela inicial era a mesma para todos e falava de "suas atividades de
 * aprendizado" ate para quem administra a empresa.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class HomeSummaryServiceTest {

    private static final UUID EMPRESA = UUID.fromString("11111111-1111-1111-1111-111111111111");

    @Mock private UserRepository userRepository;
    @Mock private CourseRepository courseRepository;
    @Mock private EnrollmentRepository enrollmentRepository;
    @Mock private CertificationRepository certificationRepository;
    @Mock private CompanyInvitationRepository invitationRepository;
    @Mock private TenantRepository tenantRepository;
    @Mock private LessonRepository lessonRepository;
    @Mock private LessonProgressRepository lessonProgressRepository;

    @InjectMocks private HomeSummaryService service;

    private CustomUserDetails usuario(Role papel) {
        Tenant tenant = new Tenant();
        tenant.setId(EMPRESA);

        User user = new User();
        user.setId(UUID.randomUUID());
        user.setTenant(tenant);
        user.setEmail("pessoa@empresa.com");
        user.setName("Ana Martins");
        user.setPasswordHash("hash");
        user.setRole(papel);
        user.setIsActive(true);
        return new CustomUserDetails(user);
    }

    @Test
    void cadaPerfilRecebeUmaMensagemDiferente() {
        when(enrollmentRepository.findByUserId(any())).thenReturn(List.of());
        when(certificationRepository.findByUserId(any())).thenReturn(List.of());

        String supremo = service.summaryFor(usuario(Role.SUPER_ADMIN)).getHeadline();
        String admin = service.summaryFor(usuario(Role.ADMIN)).getHeadline();
        String gestor = service.summaryFor(usuario(Role.MANAGER)).getHeadline();
        String instrutor = service.summaryFor(usuario(Role.INSTRUCTOR)).getHeadline();
        String aluno = service.summaryFor(usuario(Role.STUDENT)).getHeadline();

        assertEquals(5, java.util.Set.of(supremo, admin, gestor, instrutor, aluno).size(),
                "cada perfil precisa de um texto próprio");
        assertEquals("Plataforma Trainify", supremo);
        assertEquals("Sua empresa", admin);
        assertEquals("Sua equipe", gestor);
        assertEquals("Seus cursos", instrutor);
        assertEquals("Bons estudos", aluno);
    }

    @Test
    void oAdminVeNumerosDaEmpresaENaoDeAprendizado() {
        when(userRepository.countByTenantIdAndIsActiveTrue(EMPRESA)).thenReturn(11L);
        when(invitationRepository.countPendentesPorEmpresa(EMPRESA)).thenReturn(2L);
        when(courseRepository.countByTenantIdAndStatus(any(), any())).thenReturn(3L);

        var resumo = service.summaryFor(usuario(Role.ADMIN));
        var rotulos = resumo.getCards().stream().map(c -> c.getLabel()).toList();

        assertTrue(rotulos.contains("Pessoas ativas"));
        assertTrue(rotulos.contains("Convites pendentes"));
        assertEquals(11, resumo.getCards().get(0).getValue());
        assertFalse(rotulos.contains("Certificados"), "admin não é aluno");
    }

    @Test
    void oGestorRecebeATaxaDeConclusao() {
        when(enrollmentRepository.countByTenantIdAndStatus(any(),
                org.mockito.ArgumentMatchers.eq(com.trainify.lms.domain.enums.EnrollmentStatus.IN_PROGRESS)))
                .thenReturn(1L);
        when(enrollmentRepository.countByTenantIdAndStatus(any(),
                org.mockito.ArgumentMatchers.eq(com.trainify.lms.domain.enums.EnrollmentStatus.COMPLETED)))
                .thenReturn(3L);

        var resumo = service.summaryFor(usuario(Role.MANAGER));
        var taxa = resumo.getCards().stream().filter(c -> c.getLabel().equals("Taxa de conclusão")).findFirst();

        assertTrue(taxa.isPresent());
        assertEquals(75, taxa.get().getValue());
        assertEquals("%", taxa.get().getSuffix());
    }

    @Test
    void oInstrutorVeApenasOsCursosQueEleCriou() {
        when(courseRepository.countByInstructorIdAndStatus(any(), any())).thenReturn(2L);

        var resumo = service.summaryFor(usuario(Role.INSTRUCTOR));

        assertEquals("Seus cursos", resumo.getHeadline());
        assertTrue(resumo.getCards().stream().anyMatch(c -> c.getLabel().equals("Rascunhos")));
        // Conta por instrutor, nao por empresa
        org.mockito.Mockito.verify(courseRepository, org.mockito.Mockito.never())
                .countByTenantIdAndStatus(any(), any());
    }

    @Test
    void semDadosNenhumNadaQuebraEOsNumerosFicamEmZero() {
        when(enrollmentRepository.findByUserId(any())).thenReturn(List.of());
        when(certificationRepository.findByUserId(any())).thenReturn(List.of());

        var resumo = service.summaryFor(usuario(Role.STUDENT));

        assertTrue(resumo.getCards().stream().allMatch(c -> c.getValue() == 0));
        assertEquals(4, resumo.getCards().size());
    }
}
