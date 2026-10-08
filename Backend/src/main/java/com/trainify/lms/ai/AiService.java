package com.trainify.lms.ai;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.trainify.lms.domain.entities.Assessment;
import com.trainify.lms.domain.entities.AssessmentOption;
import com.trainify.lms.domain.entities.AssessmentQuestion;
import com.trainify.lms.domain.entities.Lesson;
import com.trainify.lms.dto.CreateAssessmentRequest;
import com.trainify.lms.repositories.AssessmentRepository;
import com.trainify.lms.repositories.LessonRepository;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

/**
 * Recursos de IA do Trainify. Todos partem do conteudo da propria aula: nada e
 * inventado a partir do nada, e o instrutor sempre revisa antes de publicar.
 */
@Service
@RequiredArgsConstructor
public class AiService {

    private static final ObjectMapper JSON = new ObjectMapper();

    private static final String PAPEL_BASE = """
            Você é o assistente do Trainify, uma plataforma de treinamento corporativo.
            Responda sempre em português do Brasil, com linguagem simples e direta.
            """;

    private final ClaudeGateway claude;
    private final LessonRepository lessonRepository;
    private final AssessmentRepository assessmentRepository;

    public boolean isEnabled() {
        return claude.isEnabled();
    }

    /** Sugere um quiz a partir do conteudo da aula. O instrutor revisa e salva. */
    @Transactional(readOnly = true)
    public CreateAssessmentRequest suggestQuiz(UUID lessonId, int numeroDePerguntas) {
        Lesson lesson = buscarAula(lessonId);
        String conteudo = conteudoDaAula(lesson);

        String system = PAPEL_BASE + """
                Sua tarefa é criar perguntas de múltipla escolha para avaliar quem assistiu à aula.

                Regras obrigatórias:
                - Use somente o que está no conteúdo da aula. Não invente fatos.
                - Cada pergunta tem exatamente 3 alternativas e apenas 1 correta.
                - As alternativas erradas devem ser plausíveis, não absurdas.
                - Não use "todas as anteriores" nem "nenhuma das anteriores".

                Responda SOMENTE com um JSON neste formato, sem comentários e sem texto fora dele:
                {"title":"...","passingScore":70,"questions":[{"text":"...","options":[{"text":"...","isCorrect":true},{"text":"...","isCorrect":false},{"text":"...","isCorrect":false}]}]}
                """;

        String pedido = "Crie " + numeroDePerguntas + " perguntas sobre a aula a seguir.\n\n"
                + "Título da aula: " + lesson.getTitle() + "\n\nConteúdo:\n" + conteudo;

        return parseQuiz(claude.complete(system, pedido), lesson.getTitle());
    }

    /** Resumo e pontos-chave da aula, para o instrutor revisar e usar. */
    @Transactional(readOnly = true)
    public AiSummaryDto summarize(UUID lessonId) {
        Lesson lesson = buscarAula(lessonId);

        String system = PAPEL_BASE + """
                Resuma a aula para quem vai estudar por ela.

                Responda SOMENTE com um JSON neste formato:
                {"summary":"dois ou três parágrafos curtos","keyPoints":["ponto 1","ponto 2","ponto 3"]}
                """;

        String resposta = claude.complete(system,
                "Título da aula: " + lesson.getTitle() + "\n\nConteúdo:\n" + conteudoDaAula(lesson));

        JsonNode node = lerJson(resposta);
        AiSummaryDto dto = new AiSummaryDto();
        dto.setSummary(node.path("summary").asText(""));

        List<String> pontos = new ArrayList<>();
        node.path("keyPoints").forEach(p -> pontos.add(p.asText()));
        dto.setKeyPoints(pontos);
        return dto;
    }

    /** Tutor: responde a duvida do aluno com base no conteudo daquela aula. */
    @Transactional(readOnly = true)
    public String tutor(UUID lessonId, String pergunta) {
        String system = PAPEL_BASE + """
                Você é o tutor do aluno durante a aula.

                Regras:
                - Responda com base no conteúdo da aula fornecido.
                - Se a resposta não estiver no conteúdo, diga isso com franqueza e oriente a procurar o instrutor.
                - Seja breve: no máximo dois parágrafos.
                - Não entregue respostas de avaliação; explique o assunto para a pessoa aprender.
                """;

        StringBuilder mensagem = new StringBuilder();
        if (lessonId != null) {
            Lesson lesson = buscarAula(lessonId);
            mensagem.append("Aula: ").append(lesson.getTitle()).append("\n\nConteúdo da aula:\n")
                    .append(conteudoDaAula(lesson)).append("\n\n");
        }
        mensagem.append("Pergunta do aluno: ").append(pergunta);

        return claude.complete(system, mensagem.toString());
    }

    /** Explica, uma a uma, as questoes que o aluno errou. */
    @Transactional(readOnly = true)
    public List<AiExplanationDto> explainMistakes(UUID lessonId, List<UUID> questoesErradas) {
        Assessment assessment = assessmentRepository.findByLessonId(lessonId)
                .orElseThrow(() -> new EntityNotFoundException("Avaliação não encontrada para esta aula"));

        UUID empresaDoUsuario = empresaAtual();
        if (empresaDoUsuario != null && assessment.getTenant() != null
                && !assessment.getTenant().getId().equals(empresaDoUsuario)) {
            throw new EntityNotFoundException("Avaliação não encontrada para esta aula");
        }

        List<AssessmentQuestion> perguntas = assessment.getQuestions().stream()
                .filter(q -> questoesErradas.contains(q.getId()))
                .toList();

        if (perguntas.isEmpty()) {
            return List.of();
        }

        String system = PAPEL_BASE + """
                O aluno errou as questões abaixo. Para cada uma, explique em no máximo três frases
                por que a resposta correta está certa, usando o conteúdo da aula.
                Não seja condescendente nem repita a pergunta.

                Responda SOMENTE com um JSON neste formato:
                {"explanations":[{"questionId":"...","explanation":"..."}]}
                """;

        StringBuilder mensagem = new StringBuilder();
        mensagem.append("Aula: ").append(assessment.getLesson().getTitle()).append("\n\nConteúdo:\n")
                .append(conteudoDaAula(assessment.getLesson())).append("\n\nQuestões erradas:\n");

        for (AssessmentQuestion pergunta : perguntas) {
            mensagem.append("- id: ").append(pergunta.getId()).append("\n  pergunta: ")
                    .append(pergunta.getQuestionText()).append("\n  resposta correta: ")
                    .append(pergunta.getOptions().stream()
                            .filter(o -> Boolean.TRUE.equals(o.getIsCorrect()))
                            .map(AssessmentOption::getOptionText)
                            .findFirst().orElse(""))
                    .append("\n");
        }

        JsonNode node = lerJson(claude.complete(system, mensagem.toString()));
        List<AiExplanationDto> explicacoes = new ArrayList<>();
        node.path("explanations").forEach(item -> {
            AiExplanationDto dto = new AiExplanationDto();
            dto.setQuestionId(item.path("questionId").asText(""));
            dto.setExplanation(item.path("explanation").asText(""));
            explicacoes.add(dto);
        });
        return explicacoes;
    }

    // ── apoio ──

    /**
     * A aula precisa ser da empresa de quem perguntou: sem esta checagem, o tutor
     * respondia usando o conteudo de outra empresa.
     */
    private Lesson buscarAula(UUID lessonId) {
        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new EntityNotFoundException("Aula não encontrada"));

        UUID empresaDoUsuario = empresaAtual();
        if (empresaDoUsuario != null && lesson.getTenant() != null
                && !lesson.getTenant().getId().equals(empresaDoUsuario)) {
            throw new EntityNotFoundException("Aula não encontrada");
        }
        return lesson;
    }

    private UUID empresaAtual() {
        var autenticacao = org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication();
        if (autenticacao == null
                || !(autenticacao.getPrincipal() instanceof com.trainify.lms.security.CustomUserDetails usuario)) {
            return null;
        }
        return usuario.getTenantId();
    }

    /**
     * Texto que a IA enxerga: o conteudo escrito e, quando existir, a transcricao
     * do video.
     */
    static String conteudoDaAulaDe(String content, String transcript) {
        StringBuilder texto = new StringBuilder();
        if (content != null && !content.isBlank()) {
            texto.append(content.trim());
        }
        if (transcript != null && !transcript.isBlank()) {
            if (texto.length() > 0) texto.append("\n\n");
            texto.append("Transcrição do vídeo:\n").append(transcript.trim());
        }

        if (texto.length() == 0) {
            throw new AiContentMissingException(
                    "Esta aula ainda não tem texto nem transcrição, então não há conteúdo para a IA usar.");
        }
        return texto.toString();
    }

    private String conteudoDaAula(Lesson lesson) {
        String transcricao = lesson.getVideoAsset() == null ? null : lesson.getVideoAsset().getTranscript();
        return conteudoDaAulaDe(lesson.getContent(), transcricao);
    }

    /**
     * Modelos costumam embrulhar o JSON em blocos de codigo; aqui pegamos apenas o
     * trecho entre chaves.
     */
    static JsonNode lerJson(String resposta) {
        int inicio = resposta.indexOf('{');
        int fim = resposta.lastIndexOf('}');
        if (inicio < 0 || fim <= inicio) {
            throw new AiUnavailableException("Não consegui entender a resposta do assistente. Tente novamente.");
        }

        try {
            return JSON.readTree(resposta.substring(inicio, fim + 1));
        } catch (Exception e) {
            throw new AiUnavailableException("Não consegui entender a resposta do assistente. Tente novamente.");
        }
    }

    static CreateAssessmentRequest parseQuiz(String resposta, String tituloDaAula) {
        JsonNode node = lerJson(resposta);

        CreateAssessmentRequest request = new CreateAssessmentRequest();
        String titulo = node.path("title").asText("");
        request.setTitle(titulo.isBlank() ? "Avaliação: " + tituloDaAula : titulo);
        request.setPassingScore(node.path("passingScore").asInt(70));
        request.setMaxAttempts(3);

        List<CreateAssessmentRequest.QuestionRequest> perguntas = new ArrayList<>();
        for (JsonNode q : node.path("questions")) {
            CreateAssessmentRequest.QuestionRequest pergunta = new CreateAssessmentRequest.QuestionRequest();
            pergunta.setText(q.path("text").asText(""));

            List<CreateAssessmentRequest.OptionRequest> opcoes = new ArrayList<>();
            for (JsonNode o : q.path("options")) {
                CreateAssessmentRequest.OptionRequest opcao = new CreateAssessmentRequest.OptionRequest();
                opcao.setText(o.path("text").asText(""));
                opcao.setIsCorrect(o.path("isCorrect").asBoolean(false));
                opcoes.add(opcao);
            }
            pergunta.setOptions(opcoes);
            perguntas.add(pergunta);
        }
        request.setQuestions(perguntas);

        // A mesma validacao usada quando o instrutor salva a mao
        com.trainify.lms.services.AssessmentService.validate(request);
        return request;
    }
}
