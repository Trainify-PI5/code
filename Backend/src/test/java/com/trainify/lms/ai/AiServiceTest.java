package com.trainify.lms.ai;

import com.trainify.lms.domain.entities.Assessment;
import com.trainify.lms.domain.entities.AssessmentOption;
import com.trainify.lms.domain.entities.AssessmentQuestion;
import com.trainify.lms.domain.entities.Lesson;
import com.trainify.lms.domain.entities.MediaAsset;
import com.trainify.lms.dto.CreateAssessmentRequest;
import com.trainify.lms.repositories.AssessmentRepository;
import com.trainify.lms.repositories.LessonRepository;
import com.trainify.lms.repositories.UserAssessmentAnswerRepository;
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
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AiServiceTest {

    @Mock private ClaudeGateway claude;
    @Mock private LessonRepository lessonRepository;
    @Mock private AssessmentRepository assessmentRepository;
    @Mock private UserAssessmentAnswerRepository answerRepository;

    @InjectMocks private AiService aiService;

    @org.junit.jupiter.api.AfterEach
    void limparContexto() {
        org.springframework.security.core.context.SecurityContextHolder.clearContext();
    }

    /**
     * A explicacao revela a resposta certa, entao quem estuda so a recebe para o
     * que errou de verdade. Aqui interessa o recorte das questoes, nao a regra de
     * perfil, entao o teste entra como instrutor.
     */
    private void entrarComoInstrutor() {
        com.trainify.lms.domain.entities.Tenant tenant = new com.trainify.lms.domain.entities.Tenant();
        tenant.setId(UUID.randomUUID());

        com.trainify.lms.domain.entities.User user = new com.trainify.lms.domain.entities.User();
        user.setId(UUID.randomUUID());
        user.setTenant(tenant);
        user.setEmail("instrutor@empresa.com");
        user.setName("Instrutor");
        user.setPasswordHash("hash");
        user.setRole(com.trainify.lms.domain.enums.Role.INSTRUCTOR);
        user.setIsActive(true);

        var detalhes = new com.trainify.lms.security.CustomUserDetails(user);
        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                        detalhes, null, detalhes.getAuthorities()));
    }

    private Lesson aulaCom(String conteudo, String transcricao) {
        Lesson lesson = new Lesson();
        lesson.setId(UUID.randomUUID());
        lesson.setTitle("Código de conduta");
        lesson.setContent(conteudo);

        if (transcricao != null) {
            MediaAsset media = new MediaAsset();
            media.setTranscript(transcricao);
            lesson.setVideoAsset(media);
        }
        return lesson;
    }

    @Test
    void explicaApenasAsQuestoesErradas() {
        entrarComoInstrutor();
        AssessmentOption certa = new AssessmentOption();
        certa.setId(UUID.randomUUID());
        certa.setOptionText("Avisar o líder");
        certa.setIsCorrect(true);

        AssessmentQuestion errada = new AssessmentQuestion();
        errada.setId(UUID.randomUUID());
        errada.setQuestionText("O que fazer ao se atrasar?");
        errada.setOptions(new ArrayList<>(List.of(certa)));

        AssessmentQuestion outra = new AssessmentQuestion();
        outra.setId(UUID.randomUUID());
        outra.setQuestionText("Pergunta que o aluno acertou");
        outra.setOptions(new ArrayList<>(List.of(certa)));

        Lesson lesson = aulaCom("Avise o líder assim que souber.", null);
        Assessment assessment = new Assessment();
        assessment.setLesson(lesson);
        assessment.setQuestions(new ArrayList<>(List.of(errada, outra)));

        when(assessmentRepository.findByLessonId(lesson.getId())).thenReturn(Optional.of(assessment));
        when(claude.complete(anyString(), anyString())).thenReturn(
                "{\"explanations\":[{\"questionId\":\"" + errada.getId() + "\",\"explanation\":\"Porque o líder precisa saber.\"}]}");

        List<AiExplanationDto> explicacoes = aiService.explainMistakes(lesson.getId(), List.of(errada.getId()));

        ArgumentCaptor<String> mensagem = ArgumentCaptor.forClass(String.class);
        verify(claude).complete(anyString(), mensagem.capture());
        assertTrue(mensagem.getValue().contains("O que fazer ao se atrasar?"));
        assertFalse(mensagem.getValue().contains("Pergunta que o aluno acertou"), "não envia o que ele acertou");

        assertEquals(1, explicacoes.size());
        assertEquals("Porque o líder precisa saber.", explicacoes.get(0).getExplanation());
    }

    @Test
    void semQuestoesErradasNaoGastaChamada() {
        Lesson lesson = aulaCom("Conteúdo", null);
        Assessment assessment = new Assessment();
        assessment.setLesson(lesson);
        assessment.setQuestions(new ArrayList<>());
        when(assessmentRepository.findByLessonId(lesson.getId())).thenReturn(Optional.of(assessment));

        assertTrue(aiService.explainMistakes(lesson.getId(), List.of(UUID.randomUUID())).isEmpty());
        verify(claude, org.mockito.Mockito.never()).complete(any(), any());
    }
}
