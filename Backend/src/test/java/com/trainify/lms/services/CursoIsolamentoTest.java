package com.trainify.lms.services;

import com.trainify.lms.domain.entities.*;
import com.trainify.lms.domain.enums.CourseStatus;
import com.trainify.lms.domain.enums.Role;
import com.trainify.lms.dto.CreateLessonRequest;
import com.trainify.lms.dto.CreateModuleRequest;
import com.trainify.lms.repositories.*;
import com.trainify.lms.security.CustomUserDetails;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Ler um curso, publicar, adicionar modulo e adicionar aula nao olhavam a
 * empresa: bastava conhecer o identificador para alcancar o curso de outra.
 * A checagem de instrutor tambem nao olhava — quem administrava uma empresa
 * administrava todas.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class CursoIsolamentoTest {

    @Mock private CourseRepository courseRepository;
    @Mock private ModuleRepository moduleRepository;
    @Mock private LessonRepository lessonRepository;
    @Mock private UserRepository userRepository;
    @Mock private MediaAssetRepository mediaAssetRepository;
    @Mock private AssessmentRepository assessmentRepository;
    @Mock private EnrollmentRepository enrollmentRepository;
    @Mock private NotificationService notificationService;
    @Mock private ActivityLogService activityLog;
    @Mock private org.springframework.context.ApplicationEventPublisher events;

    @InjectMocks private CourseService courseService;

    private final UUID empresaDoCurso = UUID.randomUUID();
    private final UUID outraEmpresa = UUID.randomUUID();
    private Course curso;
    private com.trainify.lms.domain.entities.Module modulo;

    @BeforeEach
    void preparar() {
        Tenant dona = new Tenant();
        dona.setId(empresaDoCurso);

        User instrutor = new User();
        instrutor.setId(UUID.randomUUID());

        curso = new Course();
        curso.setId(UUID.randomUUID());
        curso.setTitle("Treinamento interno da concorrente");
        curso.setStatus(CourseStatus.DRAFT);
        curso.setTenant(dona);
        curso.setInstructor(instrutor);

        modulo = new com.trainify.lms.domain.entities.Module();
        modulo.setId(UUID.randomUUID());
        modulo.setCourse(curso);

        when(courseRepository.findById(curso.getId())).thenReturn(Optional.of(curso));
        when(moduleRepository.findById(modulo.getId())).thenReturn(Optional.of(modulo));
    }

    @AfterEach
    void encerrarSessao() {
        SecurityContextHolder.clearContext();
    }

    private void entrarComo(Role papel, UUID empresa) {
        Tenant tenant = new Tenant();
        tenant.setId(empresa);

        User user = new User();
        user.setId(UUID.randomUUID());
        user.setTenant(tenant);
        user.setEmail("pessoa@outra.com");
        user.setName("Pessoa de outra empresa");
        user.setPasswordHash("hash");
        user.setRole(papel);
        user.setIsActive(true);

        var detalhes = new CustomUserDetails(user);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(detalhes, null, detalhes.getAuthorities()));
    }

    @Test
    void alunoDeOutraEmpresaNaoLeOCurso() {
        entrarComo(Role.STUDENT, outraEmpresa);

        assertThrows(EntityNotFoundException.class, () -> courseService.getCourseById(curso.getId()));
    }

    @Test
    void administradorDeOutraEmpresaTambemNaoLe() {
        // Antes, ser administrador dispensava qualquer checagem
        entrarComo(Role.ADMIN, outraEmpresa);

        assertThrows(EntityNotFoundException.class, () -> courseService.getCourseById(curso.getId()));
    }

    @Test
    void administradorDeOutraEmpresaNaoPublicaOCursoAlheio() {
        entrarComo(Role.ADMIN, outraEmpresa);

        assertThrows(EntityNotFoundException.class, () -> courseService.publishCourse(curso.getId()));
        verify(courseRepository, never()).save(any());
    }

    @Test
    void naoDaParaEnfiarModuloNoCursoDeOutraEmpresa() {
        entrarComo(Role.ADMIN, outraEmpresa);
        CreateModuleRequest pedido = new CreateModuleRequest();
        pedido.setTitle("Módulo intruso");

        assertThrows(EntityNotFoundException.class, () -> courseService.addModule(curso.getId(), pedido));
        verify(moduleRepository, never()).save(any());
    }

    @Test
    void naoDaParaEnfiarAulaNoModuloDeOutraEmpresa() {
        entrarComo(Role.INSTRUCTOR, outraEmpresa);
        CreateLessonRequest pedido = new CreateLessonRequest();
        pedido.setTitle("Aula intrusa");

        assertThrows(EntityNotFoundException.class, () -> courseService.addLesson(modulo.getId(), pedido));
        verify(lessonRepository, never()).save(any());
    }

    @Test
    void quemEDaEmpresaContinuaLendoNormalmente() {
        entrarComo(Role.STUDENT, empresaDoCurso);
        when(moduleRepository.findByCourseIdOrderByOrderIndexAsc(curso.getId())).thenReturn(java.util.List.of());

        assertEquals("Treinamento interno da concorrente", courseService.getCourseById(curso.getId()).getTitle());
    }

    @Test
    void semUsuarioNenhumNaoSeLeCurso() {
        assertThrows(EntityNotFoundException.class, () -> courseService.getCourseById(curso.getId()));
    }
}
