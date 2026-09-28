package com.trainify.lms.ai;

import com.trainify.lms.domain.entities.Assessment;
import com.trainify.lms.domain.entities.AssessmentOption;
import com.trainify.lms.domain.entities.AssessmentQuestion;
import com.trainify.lms.domain.entities.Lesson;
import com.trainify.lms.domain.entities.MediaAsset;
import com.trainify.lms.dto.CreateAssessmentRequest;
import com.trainify.lms.repositories.AssessmentRepository;
import com.trainify.lms.repositories.LessonRepository;
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

    @InjectMocks private AiService aiService;

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
    void oPedidoDoQuizLevaOConteudoDaAula() {
        Lesson lesson = aulaCom("Capacete e colete sao obrigatorios nas areas de carga.", null);
        when(lessonRepository.findById(lesson.getId())).thenReturn(Optional.of(lesson));
        when(claude.complete(anyString(), anyString())).thenReturn("""
                {"title":"Avaliação","passingScore":70,"questions":[
                  {"text":"Onde o capacete é obrigatório?","options":[
                    {"text":"Nas áreas de carga","isCorrect":true},
                    {"text":"Só na chuva","isCorrect":false},
                    {"text":"Nunca","isCorrect":false}]}]}
                """);

        CreateAssessmentRequest quiz = aiService.suggestQuiz(lesson.getId(), 3);

        ArgumentCaptor<String> mensagem = ArgumentCaptor.forClass(String.class);
        verify(claude).complete(anyString(), mensagem.capture());
        assertTrue(mensagem.getValue().contains("Capacete e colete"), "o conteúdo da aula precisa ir junto");
        assertTrue(mensagem.getValue().contains("Crie 3 perguntas"));

        assertEquals(1, quiz.getQuestions().size());
        assertEquals(70, quiz.getPassingScore());
        assertEquals(3, quiz.getMaxAttempts());
        assertEquals("Nas áreas de carga", quiz.getQuestions().get(0).getOptions().get(0).getText());
    }

    @Test
    void aTranscricaoDoVideoTambemEntraNoContexto() {
        Lesson lesson = aulaCom(null, "Neste vídeo mostramos o uso do colete.");
        when(lessonRepository.findById(lesson.getId())).thenReturn(Optional.of(lesson));
        when(claude.complete(anyString(), anyString())).thenReturn("Resposta do tutor");

        aiService.tutor(lesson.getId(), "para que serve o colete?");

        ArgumentCaptor<String> mensagem = ArgumentCaptor.forClass(String.class);
        verify(claude).complete(anyString(), mensagem.capture());
        assertTrue(mensagem.getValue().contains("Transcrição do vídeo"));
        assertTrue(mensagem.getValue().contains("para que serve o colete?"));
    }

    @Test
    void aulaSemConteudoNaoChegaAChamarAIa() {
        Lesson lesson = aulaCom("   ", null);
        when(lessonRepository.findById(lesson.getId())).thenReturn(Optional.of(lesson));

        AiContentMissingException erro = assertThrows(AiContentMissingException.class,
                () -> aiService.suggestQuiz(lesson.getId(), 3));

        assertTrue(erro.getMessage().contains("transcrição"));
        verify(claude, org.mockito.Mockito.never()).complete(any(), any());
    }

    @Test
    void quizInvalidoDoModeloEhRecusado() {
        // Duas alternativas corretas: a mesma validacao do cadastro manual barra
        String resposta = """
                {"questions":[{"text":"Pergunta","options":[
                  {"text":"A","isCorrect":true},
                  {"text":"B","isCorrect":true}]}]}
                """;

        assertThrows(IllegalArgumentException.class, () -> AiService.parseQuiz(resposta, "Aula"));
    }

    @Test
    void entendeJsonEmbrulhadoEmBlocoDeCodigo() {
        String resposta = """
                Claro! Aqui está o quiz:
                ```json
                {"title":"Teste","passingScore":80,"questions":[{"text":"P?","options":[
                  {"text":"Certa","isCorrect":true},
                  {"text":"Errada","isCorrect":false}]}]}
                ```
                """;

        CreateAssessmentRequest quiz = AiService.parseQuiz(resposta, "Aula");
        assertEquals("Teste", quiz.getTitle());
        assertEquals(80, quiz.getPassingScore());
    }

    @Test
    void respostaSemJsonViraMensagemAmigavel() {
        assertThrows(AiUnavailableException.class,
                () -> AiService.parseQuiz("desculpe, não consegui", "Aula"));
    }

    @Test
    void explicaApenasAsQuestoesErradas() {
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
