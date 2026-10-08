package com.trainify.lms.services;

import com.trainify.lms.domain.entities.*;
import com.trainify.lms.domain.entities.Module;
import com.trainify.lms.domain.enums.Role;
import com.trainify.lms.repositories.AssessmentAttemptRepository;
import com.trainify.lms.repositories.AssessmentRepository;
import com.trainify.lms.repositories.EnrollmentRepository;
import com.trainify.lms.repositories.LessonRepository;
import com.trainify.lms.repositories.UserAssessmentAnswerRepository;
import com.trainify.lms.security.CustomUserDetails;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.access.AccessDeniedException;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * A prova de uma empresa nao pode ser lida por quem e de outra, nem por quem nao
 * esta matriculado no curso.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AssessmentIsolamentoTest {

    private static final UUID EMPRESA_DONA = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID OUTRA_EMPRESA = UUID.fromString("22222222-2222-2222-2222-222222222222");

    @Mock private AssessmentRepository assessmentRepository;
    @Mock private LessonRepository lessonRepository;
    @Mock private EnrollmentRepository enrollmentRepository;
    @Mock private UserAssessmentAnswerRepository answerRepository;
    @Mock private AssessmentAttemptRepository attemptRepository;
    @Mock private ProgressService progressService;

    @InjectMocks private AssessmentService assessmentService;

    private final UUID lessonId = UUID.randomUUID();
    private final UUID courseId = UUID.randomUUID();

    private Assessment avaliacaoDaEmpresaDona() {
        Tenant tenant = new Tenant();
        tenant.setId(EMPRESA_DONA);

        Course course = new Course();
        course.setId(courseId);

        Module module = new Module();
        module.setCourse(course);

        Lesson lesson = new Lesson();
        lesson.setId(lessonId);
        lesson.setTitle("Código de conduta");
        lesson.setModule(module);
        lesson.setTenant(tenant);

        AssessmentQuestion pergunta = new AssessmentQuestion();
        pergunta.setId(UUID.randomUUID());
        pergunta.setQuestionText("O que fazer ao se atrasar?");
        pergunta.setOptions(new ArrayList<>());

        Assessment assessment = new Assessment();
        assessment.setId(UUID.randomUUID());
        assessment.setTenant(tenant);
        assessment.setLesson(lesson);
        assessment.setPassingScore(70);
        assessment.setMaxAttempts(3);
        assessment.setQuestions(new ArrayList<>(List.of(pergunta)));
        return assessment;
    }

    private CustomUserDetails usuario(UUID tenantId, Role papel) {
        Tenant tenant = new Tenant();
        tenant.setId(tenantId);

        User user = new User();
        user.setId(UUID.randomUUID());
        user.setTenant(tenant);
        user.setEmail("pessoa@empresa.com");
        user.setName("Pessoa");
        user.setPasswordHash("hash");
        user.setRole(papel);
        user.setIsActive(true);
        return new CustomUserDetails(user);
    }

    @Test
    void genteDeOutraEmpresaNaoLeAProva() {
        when(assessmentRepository.findByLessonId(lessonId)).thenReturn(Optional.of(avaliacaoDaEmpresaDona()));

        // Mesmo sendo administrador, e de outra empresa
        assertThrows(EntityNotFoundException.class,
                () -> assessmentService.getAssessmentByLessonId(lessonId, usuario(OUTRA_EMPRESA, Role.ADMIN)));
    }

    @Test
    void alunoSemMatriculaNaoLeAProva() {
        when(assessmentRepository.findByLessonId(lessonId)).thenReturn(Optional.of(avaliacaoDaEmpresaDona()));
        when(enrollmentRepository.findByUserIdAndCourseId(any(), any())).thenReturn(Optional.empty());

        AccessDeniedException erro = assertThrows(AccessDeniedException.class,
                () -> assessmentService.getAssessmentByLessonId(lessonId, usuario(EMPRESA_DONA, Role.STUDENT)));

        assertTrue(erro.getMessage().contains("Matricule-se"));
    }

    @Test
    void alunoMatriculadoLeNormalmente() {
        Assessment assessment = avaliacaoDaEmpresaDona();
        when(assessmentRepository.findByLessonId(lessonId)).thenReturn(Optional.of(assessment));

        Enrollment matricula = new Enrollment();
        matricula.setId(UUID.randomUUID());
        when(enrollmentRepository.findByUserIdAndCourseId(any(), any())).thenReturn(Optional.of(matricula));
        when(attemptRepository.findByEnrollmentIdAndAssessmentIdOrderByAttemptNumberAsc(any(), any()))
                .thenReturn(List.of());

        var dto = assessmentService.getAssessmentByLessonId(lessonId, usuario(EMPRESA_DONA, Role.STUDENT));

        assertEquals(1, dto.getQuestions().size());
        assertEquals(3, dto.getAttemptsRemaining());
    }

    @Test
    void instrutorDaEmpresaConfereSemEstarMatriculado() {
        when(assessmentRepository.findByLessonId(lessonId)).thenReturn(Optional.of(avaliacaoDaEmpresaDona()));
        when(enrollmentRepository.findByUserIdAndCourseId(any(), any())).thenReturn(Optional.empty());

        var dto = assessmentService.getAssessmentByLessonId(lessonId, usuario(EMPRESA_DONA, Role.INSTRUCTOR));

        assertEquals(1, dto.getQuestions().size());
    }
}
