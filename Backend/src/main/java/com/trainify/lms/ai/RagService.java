package com.trainify.lms.ai;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.trainify.lms.domain.entities.Lesson;
import com.trainify.lms.dto.CreateAssessmentRequest;
import com.trainify.lms.repositories.LessonRepository;
import com.trainify.lms.services.AssessmentService;

import feign.FeignException;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Chat e geracao de quiz pelo servico de IA (RAG sobre o material dos cursos).
 * Aqui so se resolve quem pergunta e o que pode ver; buscar e gerar e com o
 * servico Python.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RagService {

    /** Mensagens anteriores levadas para a IA (o servico usa as ultimas 6). */
    static final int MAX_HISTORICO = 10;
    static final int MAX_TAMANHO_MENSAGEM = 8000;

    private static final ObjectMapper JSON = new ObjectMapper();

    private final TrainifyAiClient ai;
    private final AiCourseScope scope;
    private final LessonRepository lessonRepository;

    public record Mensagem(String role, String content) {}

    public record Fonte(String courseId, String lessonId, String lessonTitle) {}

    public record RespostaChat(String response, List<Fonte> sources) {}

    /** Usado pela tela para esconder os recursos de IA quando o servico nao esta pronto. */
    public boolean disponivel() {
        try {
            return ai.health().llmConfigured();
        } catch (Exception e) {
            return false;
        }
    }

    public RespostaChat chat(String pergunta, List<Mensagem> historico, UUID lessonId, UUID courseId) {
        if (pergunta == null || pergunta.isBlank()) {
            throw new IllegalArgumentException("Escreva uma pergunta.");
        }

        AiCourseScope.Escopo escopo = scope.resolver(lessonId, courseId);
        if (escopo.courseIds().isEmpty()) {
            return new RespostaChat(
                    "Você ainda não tem cursos com material disponível para o assistente. "
                            + "Assim que se matricular em um curso, posso tirar dúvidas sobre ele.",
                    List.of());
        }

        TrainifyAiClient.ChatResponse resposta = chamar(() -> ai.chat(new TrainifyAiClient.ChatRequest(
                pergunta.trim(),
                historicoValido(historico),
                escopo.role().name(),
                escopo.courseIds(),
                escopo.lessonId())));

        List<Fonte> fontes = resposta.sources() == null ? List.of()
                : resposta.sources().stream().map(f -> new Fonte(f.courseId(), f.lessonId(), f.lessonTitle())).toList();
        return new RespostaChat(resposta.answer(), fontes);
    }

    /**
     * Sugere um quiz para a aula de avaliacao. No Trainify o quiz e uma aula
     * propria, sem conteudo: as perguntas saem do material das outras aulas do
     * mesmo modulo. Nada e salvo; o instrutor revisa antes.
     */
    @Transactional(readOnly = true)
    public CreateAssessmentRequest suggestQuiz(UUID lessonId, int perguntas, String foco) {
        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new EntityNotFoundException("Aula não encontrada"));
        UUID courseId = lesson.getModule().getCourse().getId();
        scope.resolver(null, courseId); // so quem tem acesso ao curso

        TrainifyAiClient.QuizResponse quiz = chamar(() -> ai.quiz(new TrainifyAiClient.QuizRequest(
                courseId.toString(),
                null,
                lesson.getModule().getId().toString(),
                perguntas,
                4,
                foco == null || foco.isBlank() ? null : foco.trim())));

        CreateAssessmentRequest pedido = new CreateAssessmentRequest();
        pedido.setTitle(quiz.title() == null || quiz.title().isBlank() ? "Avaliação: " + lesson.getModule().getTitle() : quiz.title());
        pedido.setPassingScore(quiz.passingScore() == null ? 70 : quiz.passingScore());
        pedido.setMaxAttempts(quiz.maxAttempts() == null ? 3 : quiz.maxAttempts());

        List<CreateAssessmentRequest.QuestionRequest> questoes = new ArrayList<>();
        for (TrainifyAiClient.QuizQuestion q : quiz.questions()) {
            CreateAssessmentRequest.QuestionRequest questao = new CreateAssessmentRequest.QuestionRequest();
            questao.setText(q.text());
            List<CreateAssessmentRequest.OptionRequest> opcoes = new ArrayList<>();
            for (TrainifyAiClient.QuizOption o : q.options()) {
                CreateAssessmentRequest.OptionRequest opcao = new CreateAssessmentRequest.OptionRequest();
                opcao.setText(o.text());
                opcao.setIsCorrect(o.isCorrect());
                opcoes.add(opcao);
            }
            questao.setOptions(opcoes);
            questoes.add(questao);
        }
        pedido.setQuestions(questoes);

        // A mesma validacao usada quando o instrutor salva a mao
        AssessmentService.validate(pedido);
        return pedido;
    }

    static List<TrainifyAiClient.HistoryMessage> historicoValido(List<Mensagem> historico) {
        if (historico == null) {
            return List.of();
        }
        List<TrainifyAiClient.HistoryMessage> validas = historico.stream()
                .filter(m -> m != null && m.content() != null && !m.content().isBlank())
                .filter(m -> "user".equals(m.role()) || "assistant".equals(m.role()))
                .map(m -> new TrainifyAiClient.HistoryMessage(m.role(), cortar(m.content())))
                .toList();
        return validas.subList(Math.max(0, validas.size() - MAX_HISTORICO), validas.size());
    }

    private static String cortar(String texto) {
        return texto.length() <= MAX_TAMANHO_MENSAGEM ? texto : texto.substring(0, MAX_TAMANHO_MENSAGEM);
    }

    /** Traduz as respostas de erro do servico de IA para as excecoes que a API ja conhece. */
    private <T> T chamar(java.util.function.Supplier<T> chamada) {
        try {
            return chamada.get();
        } catch (FeignException.UnprocessableEntity e) {
            // Ex.: modulo sem material indexado para gerar quiz
            throw new AiContentMissingException(detalhe(e, "Não há material suficiente para a IA."));
        } catch (FeignException.TooManyRequests e) {
            throw new AiUnavailableException("Muitas perguntas em pouco tempo. Aguarde alguns segundos e tente de novo.");
        } catch (FeignException.Unauthorized e) {
            log.error("Servico de IA recusou a chave interna: confira app.ai.internal-key");
            throw new AiUnavailableException("O assistente está indisponível no momento.");
        } catch (FeignException e) {
            log.warn("Servico de IA respondeu {}: {}", e.status(), e.getMessage());
            throw new AiUnavailableException(e.status() == 502
                    ? detalhe(e, "A IA não conseguiu montar a resposta agora. Tente novamente.")
                    : "O assistente está indisponível no momento. Tente novamente em instantes.");
        }
    }

    private static String detalhe(FeignException e, String padrao) {
        try {
            String corpo = e.contentUTF8();
            if (corpo == null || corpo.isBlank()) {
                return padrao;
            }
            var detail = JSON.readTree(corpo.getBytes(StandardCharsets.UTF_8)).path("detail");
            return detail.isTextual() && !detail.asText().isBlank() ? detail.asText() : padrao;
        } catch (Exception ignorado) {
            return padrao;
        }
    }
}
