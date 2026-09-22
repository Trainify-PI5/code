package com.trainify.lms.services;

import com.trainify.lms.domain.entities.*;
import com.trainify.lms.domain.entities.Module;
import com.trainify.lms.dto.AssessmentResultDto;
import com.trainify.lms.dto.CreateAssessmentRequest;
import com.trainify.lms.dto.SubmitAssessmentRequest;
import com.trainify.lms.exceptions.AssessmentAttemptsExhaustedException;
import com.trainify.lms.repositories.AssessmentAttemptRepository;
import com.trainify.lms.repositories.AssessmentRepository;
import com.trainify.lms.repositories.EnrollmentRepository;
import com.trainify.lms.repositories.LessonRepository;
import com.trainify.lms.repositories.UserAssessmentAnswerRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AssessmentAttemptsTest {

    @Mock private AssessmentRepository assessmentRepository;
    @Mock private LessonRepository lessonRepository;
    @Mock private EnrollmentRepository enrollmentRepository;
    @Mock private UserAssessmentAnswerRepository answerRepository;
    @Mock private AssessmentAttemptRepository attemptRepository;
    @Mock private ProgressService progressService;

    @InjectMocks private AssessmentService assessmentService;

    private UUID lessonId;
    private UUID userId;
    private UUID courseId;
    private Assessment assessment;
    private Enrollment enrollment;
    private AssessmentOption certa;
    private AssessmentOption errada;
    private AssessmentQuestion pergunta;

    @BeforeEach
    void setUp() {
        lessonId = UUID.randomUUID();
        userId = UUID.randomUUID();
        courseId = UUID.randomUUID();

        Course course = new Course();
        course.setId(courseId);

        Module module = new Module();
        module.setId(UUID.randomUUID());
        module.setCourse(course);

        Lesson lesson = new Lesson();
        lesson.setId(lessonId);
        lesson.setTitle("Avaliação: regras da casa");
        lesson.setModule(module);

        certa = new AssessmentOption();
        certa.setId(UUID.randomUUID());
        certa.setOptionText("Avisar o líder assim que souber");
        certa.setIsCorrect(true);

        errada = new AssessmentOption();
        errada.setId(UUID.randomUUID());
        errada.setOptionText("Não avisar e compensar depois");
        errada.setIsCorrect(false);

        pergunta = new AssessmentQuestion();
        pergunta.setId(UUID.randomUUID());
        pergunta.setQuestionText("O que fazer ao perceber que vai se atrasar?");
        pergunta.setOptions(new ArrayList<>(List.of(certa, errada)));

        Tenant tenant = new Tenant();
        tenant.setId(UUID.randomUUID());

        assessment = new Assessment();
        assessment.setId(UUID.randomUUID());
        assessment.setTenant(tenant);
        assessment.setLesson(lesson);
        assessment.setPassingScore(70);
        assessment.setMaxAttempts(3);
        assessment.setQuestions(new ArrayList<>(List.of(pergunta)));

        enrollment = new Enrollment();
        enrollment.setId(UUID.randomUUID());

        when(assessmentRepository.findByLessonId(lessonId)).thenReturn(Optional.of(assessment));
        when(enrollmentRepository.findByUserIdAndCourseId(userId, courseId)).thenReturn(Optional.of(enrollment));
        when(attemptRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void gravaATentativaComANotaEONumeroDaTentativa() {
        // Arrange: primeira tentativa
        when(attemptRepository.findByEnrollmentIdAndAssessmentIdOrderByAttemptNumberAsc(any(), any()))
                .thenReturn(List.of());

        // Act
        AssessmentResultDto resultado = assessmentService.submitAssessment(lessonId, userId, resposta(certa));

        // Assert: a nota deixa de ser descartada
        ArgumentCaptor<AssessmentAttempt> captor = ArgumentCaptor.forClass(AssessmentAttempt.class);
        verify(attemptRepository, atLeastOnce()).save(captor.capture());
        AssessmentAttempt gravada = captor.getValue();

        assertEquals(100, gravada.getScore());
        assertTrue(gravada.getPassed());
        assertEquals(1, gravada.getAttemptNumber());
        assertEquals(1, resultado.getAttemptNumber());
        assertEquals(3, resultado.getMaxAttempts());
    }

    @Test
    void mostraOQueOAlunoErrouEQualEraARespostaCerta() {
        when(attemptRepository.findByEnrollmentIdAndAssessmentIdOrderByAttemptNumberAsc(any(), any()))
                .thenReturn(List.of());

        AssessmentResultDto resultado = assessmentService.submitAssessment(lessonId, userId, resposta(errada));

        assertEquals(1, resultado.getQuestions().size());
        AssessmentResultDto.QuestionResultDto revisao = resultado.getQuestions().get(0);
        assertFalse(revisao.isCorrect());
        assertEquals(errada.getId(), revisao.getSelectedOptionId());
        assertEquals("Não avisar e compensar depois", revisao.getSelectedOptionText());
        assertEquals(certa.getId(), revisao.getCorrectOptionId());
        assertEquals("Avisar o líder assim que souber", revisao.getCorrectOptionText());
        assertEquals(2, resultado.getAttemptsRemaining());
    }

    @Test
    void recusaQuandoAsTentativasAcabaram() {
        // Arrange: 3 reprovacoes anteriores
        when(attemptRepository.findByEnrollmentIdAndAssessmentIdOrderByAttemptNumberAsc(any(), any()))
                .thenReturn(List.of(tentativa(1, false), tentativa(2, false), tentativa(3, false)));

        // Act & Assert
        AssessmentAttemptsExhaustedException erro = assertThrows(AssessmentAttemptsExhaustedException.class,
                () -> assessmentService.submitAssessment(lessonId, userId, resposta(certa)));

        assertTrue(erro.getMessage().contains("3 tentativas"));
        verify(answerRepository, never()).save(any());
        verify(progressService, never()).completeLesson(any(), any());
    }

    @Test
    void naoDeixaRefazerDepoisDeAprovado() {
        when(attemptRepository.findByEnrollmentIdAndAssessmentIdOrderByAttemptNumberAsc(any(), any()))
                .thenReturn(List.of(tentativa(1, true)));

        AssessmentAttemptsExhaustedException erro = assertThrows(AssessmentAttemptsExhaustedException.class,
                () -> assessmentService.submitAssessment(lessonId, userId, resposta(certa)));

        assertTrue(erro.getMessage().contains("aprovado"));
        verify(answerRepository, never()).save(any());
    }

    @Test
    void segundaTentativaRecebeONumeroSeguinte() {
        when(attemptRepository.findByEnrollmentIdAndAssessmentIdOrderByAttemptNumberAsc(any(), any()))
                .thenReturn(List.of(tentativa(1, false)));

        AssessmentResultDto resultado = assessmentService.submitAssessment(lessonId, userId, resposta(certa));

        assertEquals(2, resultado.getAttemptNumber());
        assertEquals(0, resultado.getAttemptsRemaining());
        verify(progressService).completeLesson(enrollment, assessment.getLesson());
    }

    @Test
    void naoAceitaQuizSemPerguntaOuSemGabarito() {
        // Sem perguntas
        CreateAssessmentRequest semPerguntas = pedido();
        semPerguntas.setQuestions(List.of());
        assertTrue(assertThrows(IllegalArgumentException.class, () -> AssessmentService.validate(semPerguntas))
                .getMessage().contains("pelo menos uma pergunta"));

        // Pergunta com uma alternativa so
        CreateAssessmentRequest umaOpcao = pedido();
        umaOpcao.getQuestions().get(0).setOptions(List.of(opcao("Única", true)));
        assertTrue(assertThrows(IllegalArgumentException.class, () -> AssessmentService.validate(umaOpcao))
                .getMessage().contains("duas alternativas"));

        // Nenhuma alternativa correta
        CreateAssessmentRequest semGabarito = pedido();
        semGabarito.getQuestions().get(0).setOptions(List.of(opcao("A", false), opcao("B", false)));
        assertTrue(assertThrows(IllegalArgumentException.class, () -> AssessmentService.validate(semGabarito))
                .getMessage().contains("exatamente uma alternativa correta"));

        // Duas corretas
        CreateAssessmentRequest duasCertas = pedido();
        duasCertas.getQuestions().get(0).setOptions(List.of(opcao("A", true), opcao("B", true)));
        assertThrows(IllegalArgumentException.class, () -> AssessmentService.validate(duasCertas));

        // Alternativa em branco
        CreateAssessmentRequest emBranco = pedido();
        emBranco.getQuestions().get(0).setOptions(List.of(opcao("A", true), opcao("   ", false)));
        assertThrows(IllegalArgumentException.class, () -> AssessmentService.validate(emBranco));

        // Controle: um quiz valido passa
        assertDoesNotThrow(() -> AssessmentService.validate(pedido()));
    }

    private CreateAssessmentRequest pedido() {
        CreateAssessmentRequest.QuestionRequest questao = new CreateAssessmentRequest.QuestionRequest();
        questao.setText("Pergunta");
        questao.setOptions(new ArrayList<>(List.of(opcao("Certa", true), opcao("Errada", false))));

        CreateAssessmentRequest request = new CreateAssessmentRequest();
        request.setTitle("Avaliação");
        request.setPassingScore(70);
        request.setMaxAttempts(3);
        request.setQuestions(new ArrayList<>(List.of(questao)));
        return request;
    }

    private CreateAssessmentRequest.OptionRequest opcao(String texto, boolean correta) {
        CreateAssessmentRequest.OptionRequest opcao = new CreateAssessmentRequest.OptionRequest();
        opcao.setText(texto);
        opcao.setIsCorrect(correta);
        return opcao;
    }

    private AssessmentAttempt tentativa(int numero, boolean aprovado) {
        AssessmentAttempt attempt = new AssessmentAttempt();
        attempt.setId(UUID.randomUUID());
        attempt.setAttemptNumber(numero);
        attempt.setScore(aprovado ? 100 : 0);
        attempt.setPassed(aprovado);
        return attempt;
    }

    private SubmitAssessmentRequest resposta(AssessmentOption escolhida) {
        SubmitAssessmentRequest request = new SubmitAssessmentRequest();
        request.setAnswers(Map.of(pergunta.getId(), escolhida.getId()));
        return request;
    }
}
