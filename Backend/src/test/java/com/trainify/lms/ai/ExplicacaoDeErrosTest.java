package com.trainify.lms.ai;

import com.trainify.lms.domain.entities.*;
import com.trainify.lms.repositories.AssessmentRepository;
import com.trainify.lms.repositories.LessonRepository;
import com.trainify.lms.repositories.UserAssessmentAnswerRepository;
import com.trainify.lms.security.CustomUserDetails;
import com.trainify.lms.domain.enums.Role;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * A explicacao de uma questao diz qual e a resposta certa e por que.
 *
 * A rota aceitava qualquer lista de questoes de qualquer pessoa autenticada:
 * bastava pedir a explicacao de todas antes de responder a avaliacao para ter o
 * gabarito, e o limite de tres tentativas deixava de significar nada.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ExplicacaoDeErrosTest {

    private static final UUID EMPRESA = UUID.randomUUID();
    private static final UUID AULA = UUID.randomUUID();
    private static final UUID QUESTAO_ERRADA = UUID.randomUUID();
    private static final UUID QUESTAO_CERTA = UUID.randomUUID();

    @Mock private ClaudeGateway claude;
    @Mock private LessonRepository lessonRepository;
    @Mock private AssessmentRepository assessmentRepository;
    @Mock private UserAssessmentAnswerRepository answerRepository;

    @InjectMocks private AiService service;

    private UUID usuarioLogado;

    @AfterEach
    void limpar() {
        SecurityContextHolder.clearContext();
    }

    private void entrarComo(Role papel) {
        Tenant tenant = new Tenant();
        tenant.setId(EMPRESA);

        User user = new User();
        user.setId(UUID.randomUUID());
        user.setTenant(tenant);
        user.setEmail("pessoa@empresa.com");
        user.setName("Pessoa");
        user.setPasswordHash("hash");
        user.setRole(papel);
        user.setIsActive(true);

        usuarioLogado = user.getId();
        var detalhes = new CustomUserDetails(user);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(detalhes, null, detalhes.getAuthorities()));
    }

    private AssessmentQuestion questao(UUID id, String texto, Assessment avaliacao) {
        AssessmentOption certa = new AssessmentOption();
        certa.setId(UUID.randomUUID());
        certa.setOptionText("A resposta certa");
        certa.setIsCorrect(true);

        AssessmentQuestion q = new AssessmentQuestion();
        q.setId(id);
        q.setQuestionText(texto);
        q.setAssessment(avaliacao);
        q.setOptions(new java.util.ArrayList<>(List.of(certa)));
        return q;
    }

    private void avaliacaoNaAula() {
        Tenant tenant = new Tenant();
        tenant.setId(EMPRESA);

        Lesson lesson = new Lesson();
        lesson.setId(AULA);
        lesson.setTitle("Segurança da informação");
        lesson.setContent("Conteúdo da aula");

        Assessment avaliacao = new Assessment();
        avaliacao.setId(UUID.randomUUID());
        avaliacao.setTenant(tenant);
        avaliacao.setLesson(lesson);
        avaliacao.setQuestions(new java.util.ArrayList<>(List.of(
                questao(QUESTAO_ERRADA, "O que é phishing?", avaliacao),
                questao(QUESTAO_CERTA, "O que é uma senha forte?", avaliacao))));

        when(assessmentRepository.findByLessonId(AULA)).thenReturn(Optional.of(avaliacao));
    }

    @Test
    void alunoQueNaoRespondeuNaoRecebeExplicacaoNenhuma() {
        entrarComo(Role.STUDENT);
        avaliacaoNaAula();
        when(answerRepository.idsDasQuestoesErradas(any(), any())).thenReturn(List.of());

        var resultado = service.explainMistakes(AULA, List.of(QUESTAO_ERRADA, QUESTAO_CERTA));

        assertTrue(resultado.isEmpty());
        verify(claude, never()).complete(any(), any());
    }

    @Test
    void alunoSoRecebeExplicacaoDoQueErrouDeVerdade() {
        entrarComo(Role.STUDENT);
        avaliacaoNaAula();
        when(answerRepository.idsDasQuestoesErradas(eq(usuarioLogado), any()))
                .thenReturn(List.of(QUESTAO_ERRADA));
        when(claude.complete(any(), any()))
                .thenReturn("{\"explanations\":[{\"questionId\":\"" + QUESTAO_ERRADA + "\",\"explanation\":\"porque sim\"}]}");

        service.explainMistakes(AULA, List.of(QUESTAO_ERRADA, QUESTAO_CERTA));

        var mensagem = org.mockito.ArgumentCaptor.forClass(String.class);
        verify(claude).complete(any(), mensagem.capture());

        assertTrue(mensagem.getValue().contains("O que é phishing?"));
        assertFalse(mensagem.getValue().contains("O que é uma senha forte?"),
                "a questão que ele acertou não pode entrar no pedido");
    }

    @Test
    void quemEnsinaContinuaPodendoRevisarQualquerQuestao() {
        entrarComo(Role.INSTRUCTOR);
        avaliacaoNaAula();
        when(claude.complete(any(), any())).thenReturn("{\"explanations\":[]}");

        service.explainMistakes(AULA, List.of(QUESTAO_ERRADA, QUESTAO_CERTA));

        var mensagem = org.mockito.ArgumentCaptor.forClass(String.class);
        verify(claude).complete(any(), mensagem.capture());

        assertTrue(mensagem.getValue().contains("O que é phishing?"));
        assertTrue(mensagem.getValue().contains("O que é uma senha forte?"));
        // Nem consulta as respostas: quem ensina ja ve o gabarito na tela de avaliacoes
        verify(answerRepository, never()).idsDasQuestoesErradas(any(), any());
    }

    @Test
    void avaliacaoDeOutraEmpresaContinuaInvisivel() {
        entrarComo(Role.STUDENT);

        Tenant outra = new Tenant();
        outra.setId(UUID.randomUUID());

        Assessment avaliacao = new Assessment();
        avaliacao.setId(UUID.randomUUID());
        avaliacao.setTenant(outra);
        when(assessmentRepository.findByLessonId(AULA)).thenReturn(Optional.of(avaliacao));

        assertThrows(jakarta.persistence.EntityNotFoundException.class,
                () -> service.explainMistakes(AULA, List.of(QUESTAO_ERRADA)));
    }
}
