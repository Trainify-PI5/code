package com.trainify.lms.ai;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.stereotype.Service;

import com.trainify.lms.ai.TrechoRepository.Trecho;
import com.trainify.lms.domain.entities.Lesson;
import com.trainify.lms.dto.CreateAssessmentRequest;
import com.trainify.lms.repositories.LessonRepository;
import com.trainify.lms.services.AssessmentService;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

/**
 * Assistente de estudos (chat) e sugestao de quiz.
 *
 * <p>O chat e um RAG simples, em tres passos:
 * <ol>
 *   <li><b>Quem pergunta e o que pode ver</b>: o {@link AiCourseScope} devolve o
 *       tipo de conta e os cursos permitidos.</li>
 *   <li><b>Recuperar</b>: a busca textual do PostgreSQL acha os trechos das aulas
 *       que tem a ver com a pergunta, so nesses cursos.</li>
 *   <li><b>Gerar</b>: a LLM recebe o prompt de sistema do tipo de conta, o
 *       historico e a pergunta junto com os trechos.</li>
 * </ol>
 */
@Service
@RequiredArgsConstructor
public class RagService {

    /** Mensagens anteriores levadas para a IA. */
    static final int MAX_HISTORICO = 10;
    static final int MAX_TAMANHO_MENSAGEM = 8000;
    static final int MAX_TAMANHO_PERGUNTA = 2000;

    /*
     * Orcamento de caracteres por pedido. A conta gratuita da Groq aceita 8 mil
     * tokens por minuto em cada modelo, e um pedido inteiro (sistema + historico +
     * material + resposta) precisa caber nisso. Em portugues, 1 token ~ 3,5 caracteres.
     */
    static final int MAX_CARACTERES_MATERIAL = 7000;
    static final int MAX_CARACTERES_HISTORICO = 4000;
    static final int MAX_CARACTERES_POR_MENSAGEM_DO_HISTORICO = 1500;
    static final int TRECHOS_NA_BUSCA = 6;
    /** Trechos com nota abaixo desta fracao da melhor ficam de fora: so combinaram de leve. */
    static final double FRACAO_DA_MELHOR_NOTA = 0.4;

    private final Llm llm;
    private final IaProperties props;
    private final AiCourseScope scope;
    private final TrechoRepository trechos;
    private final LessonRepository lessonRepository;
    private final GeradorDeQuiz geradorDeQuiz;

    public record Mensagem(String role, String content) {}
    public record Fonte(String courseId, String lessonId, String lessonTitle) {}
    public record RespostaChat(String response, List<Fonte> sources) {}

    /** Usado pela tela para esconder os recursos de IA quando a chave nao esta configurada. */
    public boolean disponivel() {
        return llm.configurada();
    }

    // ── chat ──

    public RespostaChat chat(String pergunta, List<Mensagem> historico, UUID lessonId, UUID courseId) {
        if (pergunta == null || pergunta.isBlank()) {
            throw new IllegalArgumentException("Escreva uma pergunta.");
        }
        if (pergunta.length() > MAX_TAMANHO_PERGUNTA) {
            throw new IllegalArgumentException("A pergunta passa de " + MAX_TAMANHO_PERGUNTA + " caracteres.");
        }

        // 1. Quem pergunta e o que pode ver
        AiCourseScope.Escopo escopo = scope.resolver(lessonId, courseId);
        if (escopo.courseIds().isEmpty()) {
            return new RespostaChat(
                    "Você ainda não tem cursos com material disponível para o assistente. "
                            + "Assim que se matricular em um curso, posso tirar dúvidas sobre ele.",
                    List.of());
        }
        List<UUID> cursos = escopo.courseIds().stream().map(UUID::fromString).toList();
        // A aula de avaliacao nao tem conteudo proprio: a pergunta vale para o curso
        UUID aula = ehAulaDeAvaliacao(lessonId) ? null : lessonId;

        // 2. Recuperar os trechos
        List<Mensagem> anteriores = historicoValido(historico);
        List<Trecho> material = recuperar(cursos, aula, consulta(pergunta.trim(), anteriores));

        // 3. Gerar
        String mensagem = material.isEmpty()
                ? semTrechos(cursos, pergunta.trim())
                : comTrechos(material, pergunta.trim());
        String resposta = llm.conversar(props.chat(), PromptsIa.sistemaDoChat(escopo.role()),
                paraMensagens(anteriores), mensagem);

        return new RespostaChat(resposta, fontes(material));
    }

    /**
     * Pergunta de seguimento ("e qual o prazo?") nao diz o assunto. Para a busca, ela
     * vai junto com a pergunta anterior; para a LLM, o historico resolve.
     */
    static String consulta(String pergunta, List<Mensagem> historico) {
        if (TextoIa.palavrasChave(pergunta, 20).size() >= 4) {
            return pergunta;
        }
        for (int i = historico.size() - 1; i >= 0; i--) {
            if ("user".equals(historico.get(i).role())) {
                return historico.get(i).content() + " " + pergunta;
            }
        }
        return pergunta;
    }

    /**
     * Sem aula aberta, busca nos cursos permitidos. Com uma aula aberta, a busca
     * comeca nela; se nada da aula combinar, procura no curso; e se nada combinar
     * em lugar nenhum ("resuma esta aula", "explique melhor"), vai o comeco da
     * propria aula.
     */
    List<Trecho> recuperar(List<UUID> cursos, UUID aula, String consulta) {
        String consultaTextual = TextoIa.consultaTextual(consulta);
        List<Trecho> achados;
        if (aula == null) {
            achados = relevantes(trechos.buscar(cursos, null, consultaTextual, TRECHOS_NA_BUSCA));
        } else {
            achados = relevantes(trechos.buscar(cursos, aula, consultaTextual, TRECHOS_NA_BUSCA));
            if (achados.isEmpty()) {
                // O assunto esta em outra aula do curso? Se nao estiver em lugar
                // nenhum, a pergunta e sobre a propria aula aberta.
                achados = relevantes(trechos.buscar(cursos, null, consultaTextual, TRECHOS_NA_BUSCA));
                if (achados.isEmpty()) {
                    achados = trechos.daAula(aula, TRECHOS_NA_BUSCA);
                }
            }
        }
        return dentroDoOrcamento(achados, MAX_CARACTERES_MATERIAL);
    }

    /**
     * A busca devolve tambem trechos que so tem uma palavra da pergunta. Os que
     * ficam muito abaixo do melhor nao ajudam a responder e virariam fontes erradas.
     */
    static List<Trecho> relevantes(List<Trecho> achados) {
        if (achados.isEmpty()) {
            return achados;
        }
        double corte = achados.get(0).nota() * FRACAO_DA_MELHOR_NOTA;
        return achados.stream().filter(t -> t.nota() >= corte).toList();
    }

    static List<Trecho> dentroDoOrcamento(List<Trecho> lista, int orcamento) {
        List<Trecho> cabem = new ArrayList<>();
        int total = 0;
        for (Trecho trecho : lista) {
            if (!cabem.isEmpty() && total + trecho.texto().length() > orcamento) {
                break;
            }
            cabem.add(trecho);
            total += trecho.texto().length();
        }
        return cabem;
    }

    static String comTrechos(List<Trecho> material, String pergunta) {
        StringBuilder texto = new StringBuilder("MATERIAL DO CURSO:\n");
        for (Trecho trecho : material) {
            texto.append("\n[Curso: ").append(trecho.courseTitle())
                    .append(" | Aula: ").append(trecho.lessonTitle()).append("]\n")
                    .append(semTitulo(trecho)).append('\n');
        }
        return texto.append("\nPERGUNTA: ").append(pergunta).toString();
    }

    /** O titulo da aula vai no cabecalho; no trecho ele so repetiria. */
    private static String semTitulo(Trecho trecho) {
        String prefixo = trecho.lessonTitle() + "\n";
        return trecho.texto().startsWith(prefixo) ? trecho.texto().substring(prefixo.length()) : trecho.texto();
    }

    private String semTrechos(List<UUID> cursos, String pergunta) {
        StringBuilder texto = new StringBuilder(PromptsIa.SEM_TRECHOS).append("\n\nCURSOS E AULAS:\n");
        String cursoAtual = null;
        for (TrechoRepository.AulaDoCatalogo item : trechos.catalogo(cursos, 150)) {
            if (!item.courseTitle().equals(cursoAtual)) {
                cursoAtual = item.courseTitle();
                texto.append("\nCurso: ").append(cursoAtual).append('\n');
            }
            texto.append("- ").append(item.moduleTitle()).append(" > ").append(item.lessonTitle()).append('\n');
            if (texto.length() > 3000) {
                break;
            }
        }
        return texto.append("\nPERGUNTA: ").append(pergunta).toString();
    }

    static List<Fonte> fontes(List<Trecho> material) {
        Map<UUID, Fonte> porAula = new LinkedHashMap<>();
        for (Trecho trecho : material) {
            porAula.putIfAbsent(trecho.lessonId(), new Fonte(
                    trecho.courseId().toString(), trecho.lessonId().toString(), trecho.lessonTitle()));
        }
        return new ArrayList<>(porAula.values());
    }

    private boolean ehAulaDeAvaliacao(UUID lessonId) {
        if (lessonId == null) {
            return false;
        }
        return lessonRepository.findById(lessonId)
                .map(aula -> "QUIZ".equalsIgnoreCase(aula.getLessonType()))
                .orElse(false);
    }

    // ── historico ──

    /** So mensagens de verdade, as mais recentes, e cada uma com tamanho limitado. */
    static List<Mensagem> historicoValido(List<Mensagem> historico) {
        if (historico == null) {
            return List.of();
        }
        List<Mensagem> validas = historico.stream()
                .filter(m -> m != null && m.content() != null && !m.content().isBlank())
                .filter(m -> "user".equals(m.role()) || "assistant".equals(m.role()))
                .map(m -> new Mensagem(m.role(), TextoIa.cortar(m.content(), MAX_TAMANHO_MENSAGEM)))
                .toList();
        return validas.subList(Math.max(0, validas.size() - MAX_HISTORICO), validas.size());
    }

    /**
     * O historico vira a lista de mensagens do chat (como no notebook: user e
     * assistant alternados). Do fim para o comeco, ate o orcamento de caracteres.
     */
    static List<Message> paraMensagens(List<Mensagem> historico) {
        List<Message> mensagens = new ArrayList<>();
        int total = 0;
        for (int i = historico.size() - 1; i >= 0; i--) {
            String texto = TextoIa.cortar(historico.get(i).content(), MAX_CARACTERES_POR_MENSAGEM_DO_HISTORICO);
            if (total + texto.length() > MAX_CARACTERES_HISTORICO) {
                break;
            }
            total += texto.length();
            mensagens.add(0, "user".equals(historico.get(i).role()) ? new UserMessage(texto) : new AssistantMessage(texto));
        }
        return mensagens;
    }

    // ── quiz ──

    /**
     * Sugere um quiz para a aula de avaliacao. No Trainify o quiz e uma aula
     * propria, sem conteudo: as perguntas saem do material das outras aulas do
     * mesmo modulo. Nada e salvo; o instrutor revisa antes.
     */
    public CreateAssessmentRequest suggestQuiz(UUID lessonId, int perguntas, String foco) {
        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new EntityNotFoundException("Aula não encontrada"));
        UUID courseId = lesson.getModule().getCourse().getId();
        scope.resolver(null, courseId); // so quem tem acesso ao curso

        List<Trecho> material = trechos.doModulo(lesson.getModule().getId(), 200);
        if (material.isEmpty()) {
            throw new AiContentMissingException("As aulas deste módulo ainda não têm texto para a IA usar. "
                    + "Escreva o conteúdo ou anexe um PDF nas aulas e tente de novo em alguns instantes.");
        }

        GeradorDeQuiz.Quiz quiz = geradorDeQuiz.gerar(material, perguntas, 4, foco);

        CreateAssessmentRequest pedido = new CreateAssessmentRequest();
        pedido.setTitle(quiz.title() == null || quiz.title().isBlank()
                ? "Avaliação: " + lesson.getModule().getTitle() : quiz.title());
        pedido.setPassingScore(70);
        pedido.setMaxAttempts(3);
        List<CreateAssessmentRequest.QuestionRequest> questoes = new ArrayList<>();
        for (GeradorDeQuiz.Pergunta p : quiz.questions()) {
            CreateAssessmentRequest.QuestionRequest questao = new CreateAssessmentRequest.QuestionRequest();
            questao.setText(p.text());
            List<CreateAssessmentRequest.OptionRequest> opcoes = new ArrayList<>();
            for (GeradorDeQuiz.Opcao o : p.options()) {
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
}
