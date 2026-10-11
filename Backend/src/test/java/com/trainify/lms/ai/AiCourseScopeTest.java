package com.trainify.lms.ai;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import com.trainify.lms.domain.entities.Course;
import com.trainify.lms.domain.entities.Enrollment;
import com.trainify.lms.domain.entities.Lesson;
import com.trainify.lms.domain.entities.Module;
import com.trainify.lms.domain.entities.Tenant;
import com.trainify.lms.domain.entities.User;
import com.trainify.lms.domain.enums.Role;
import com.trainify.lms.repositories.CourseRepository;
import com.trainify.lms.repositories.EnrollmentRepository;
import com.trainify.lms.repositories.LessonRepository;
import com.trainify.lms.security.CustomUserDetails;

import jakarta.persistence.EntityNotFoundException;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AiCourseScopeTest {

    @Mock private CourseRepository courseRepository;
    @Mock private EnrollmentRepository enrollmentRepository;
    @Mock private LessonRepository lessonRepository;

    @InjectMocks private AiCourseScope scope;

    private final Tenant empresa = tenant();
    private final Course matriculado = curso(empresa);
    private final Course outroDaEmpresa = curso(empresa);
    private final Course deOutraEmpresa = curso(tenant());

    @AfterEach
    void limpar() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void alunoSoConsultaOsCursosEmQueEstaMatriculado() {
        User aluno = logar(Role.STUDENT);
        when(enrollmentRepository.findByUserId(aluno.getId()))
                .thenReturn(List.of(matricula(aluno, matriculado), matricula(aluno, deOutraEmpresa)));

        AiCourseScope.Escopo escopo = scope.resolver(null, null);

        assertEquals(Role.STUDENT, escopo.role());
        // a matricula em curso de outra empresa e ignorada
        assertEquals(List.of(matriculado.getId().toString()), escopo.courseIds());
    }

    @Test
    void instrutorConsultaOsCursosQueMinistraEOsQueFaz() {
        User instrutor = logar(Role.INSTRUCTOR);
        when(courseRepository.findByInstructorId(instrutor.getId())).thenReturn(List.of(outroDaEmpresa));
        when(enrollmentRepository.findByUserId(instrutor.getId())).thenReturn(List.of(matricula(instrutor, matriculado)));

        AiCourseScope.Escopo escopo = scope.resolver(null, null);

        assertEquals(Role.INSTRUCTOR, escopo.role());
        assertEquals(List.of(outroDaEmpresa.getId().toString(), matriculado.getId().toString()), escopo.courseIds());
    }

    @Test
    void gestorConsultaTodosOsCursosDaEmpresa() {
        logar(Role.MANAGER);
        when(courseRepository.findByTenantId(empresa.getId())).thenReturn(List.of(matriculado, outroDaEmpresa));

        AiCourseScope.Escopo escopo = scope.resolver(null, null);

        assertEquals(Role.MANAGER, escopo.role());
        assertEquals(2, escopo.courseIds().size());
        verify(enrollmentRepository, never()).findByUserId(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void aulaAbertaRestringeAoCursoDelaEPriorizaAAula() {
        User aluno = logar(Role.STUDENT);
        when(enrollmentRepository.findByUserId(aluno.getId()))
                .thenReturn(List.of(matricula(aluno, matriculado)));
        Lesson aula = aula(matriculado);
        when(lessonRepository.findById(aula.getId())).thenReturn(Optional.of(aula));

        AiCourseScope.Escopo escopo = scope.resolver(aula.getId(), null);

        assertEquals(List.of(matriculado.getId().toString()), escopo.courseIds());
        assertEquals(aula.getId().toString(), escopo.lessonId());
    }

    @Test
    void aulaDeCursoSemAcessoPareceInexistente() {
        User aluno = logar(Role.STUDENT);
        when(enrollmentRepository.findByUserId(aluno.getId())).thenReturn(List.of(matricula(aluno, matriculado)));
        Lesson aulaAlheia = aula(outroDaEmpresa);
        when(lessonRepository.findById(aulaAlheia.getId())).thenReturn(Optional.of(aulaAlheia));

        assertThrows(EntityNotFoundException.class, () -> scope.resolver(aulaAlheia.getId(), null));
    }

    @Test
    void cursoSemAcessoEhRecusado() {
        User aluno = logar(Role.STUDENT);
        when(enrollmentRepository.findByUserId(aluno.getId())).thenReturn(List.of());

        assertThrows(AccessDeniedException.class, () -> scope.resolver(null, outroDaEmpresa.getId()));
    }

    // ── apoio ──

    private User logar(Role role) {
        User usuario = new User();
        usuario.setId(UUID.randomUUID());
        usuario.setTenant(empresa);
        usuario.setRole(role);
        usuario.setIsActive(true);
        CustomUserDetails detalhes = new CustomUserDetails(usuario);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(detalhes, null, detalhes.getAuthorities()));
        return usuario;
    }

    private static Tenant tenant() {
        Tenant t = new Tenant();
        t.setId(UUID.randomUUID());
        return t;
    }

    private static Course curso(Tenant tenant) {
        Course c = new Course();
        c.setId(UUID.randomUUID());
        c.setTenant(tenant);
        return c;
    }

    private static Enrollment matricula(User usuario, Course curso) {
        Enrollment e = new Enrollment();
        e.setUser(usuario);
        e.setCourse(curso);
        return e;
    }

    private static Lesson aula(Course curso) {
        Module m = new Module();
        m.setId(UUID.randomUUID());
        m.setCourse(curso);
        Lesson l = new Lesson();
        l.setId(UUID.randomUUID());
        l.setModule(m);
        return l;
    }
}
