package com.trainify.lms.ai;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.trainify.lms.domain.entities.Assessment;
import com.trainify.lms.domain.entities.AssessmentOption;
import com.trainify.lms.domain.entities.AssessmentQuestion;
import com.trainify.lms.domain.entities.Lesson;
import com.trainify.lms.repositories.AssessmentRepository;
import com.trainify.lms.repositories.LessonRepository;
import com.trainify.lms.repositories.UserAssessmentAnswerRepository;
import com.trainify.lms.security.CustomUserDetails;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

/**
 * Resumo da aula e explicacao das questoes erradas, feitos direto com o
 * conteudo da aula. Chat e quiz ficam no {@link RagService}, que busca no
 * material de todo o curso pelo servico de IA.
 */
@Service
@RequiredArgsConstructor
public class AiService {

    private static final ObjectMapper JSON = new ObjectMapper();

    private static final String PAPEL_BASE = """
            Você é o assistente do Trainify, uma plataforma de treinamento corporativo.
            Responda sempre em português do Brasil, com linguagem simples e direta.
            """;

    /** Perfis que ja enxergam o gabarito pela propria tela de avaliacoes. */
    private static final Set<String> VE_GABARITO = Set.of(
            "ROLE_SUPER_ADMIN", "ROLE_ADMIN", "ROLE_MANAGER", "ROLE_INSTRUCTOR");

    private final ClaudeGateway claude;
    private final LessonRepository lessonRepository;
    private final AssessmentRepository assessmentRepository;
    private final UserAssessmentAnswerRepository answerRepository;

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

        // A explicacao diz qual e a resposta certa e por que. Quem estuda so pode
        // pedi-la para o que errou de verdade, depois de responder: sem isto bastava
        // pedir a explicacao de todas as questoes para ter o gabarito antes da
        // primeira tentativa, e o limite de tentativas perdia o sentido.
        List<UUID> pedidas = questoesErradas == null ? List.of() : questoesErradas;
        if (!veGabarito()) {
            CustomUserDetails usuario = usuarioAtual();
            if (usuario == null) {
                return List.of();
            }
            Set<UUID> errouMesmo = new HashSet<>(
                    answerRepository.idsDasQuestoesErradas(usuario.getId(), assessment.getId()));
            pedidas = pedidas.stream().filter(errouMesmo::contains).toList();
        }

        final List<UUID> permitidas = pedidas;
        List<AssessmentQuestion> perguntas = assessment.getQuestions().stream()
                .filter(q -> permitidas.contains(q.getId()))
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

    private boolean veGabarito() {
        CustomUserDetails usuario = usuarioAtual();
        if (usuario == null) {
            return false;
        }
        return usuario.getAuthorities().stream()
                .anyMatch(a -> VE_GABARITO.contains(a.getAuthority()));
    }

    private CustomUserDetails usuarioAtual() {
        var autenticacao = org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication();
        if (autenticacao == null || !(autenticacao.getPrincipal() instanceof CustomUserDetails usuario)) {
            return null;
        }
        return usuario;
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
}
