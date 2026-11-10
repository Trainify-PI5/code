package com.trainify.lms.ai;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Random;
import java.util.Set;

import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.trainify.lms.ai.TrechoRepository.Trecho;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Gera um quiz de multipla escolha a partir do material das aulas.
 *
 * <p>E a parte "estruturacao de dados" do notebook: a LLM devolve um JSON e o
 * codigo confere se ele esta certo (quantidade de perguntas, uma unica
 * alternativa correta, nada repetido). Se estiver errado, pede de novo dizendo
 * o que corrigir, ate {@link #MAX_TENTATIVAS} vezes.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class GeradorDeQuiz {

    static final int MAX_TENTATIVAS = 3;
    /** ~2.600 tokens de material: sobra espaco para a resposta dentro do limite por minuto. */
    static final int MAX_CARACTERES_MATERIAL = 9000;
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final List<String> PROIBIDAS = List.of("todas as anteriores", "nenhuma das anteriores", "todas as alternativas");

    private final Llm llm;
    private final IaProperties props;

    public record Opcao(String text, boolean isCorrect) {}
    public record Pergunta(String text, String explanation, List<Opcao> options) {}
    public record Quiz(String title, List<Pergunta> questions) {}

    public Quiz gerar(List<Trecho> material, int perguntas, int opcoes, String foco) {
        String tema = foco == null || foco.isBlank() ? null : TextoIa.cortar(foco.trim(), 300);
        String pedido = pedido(selecionar(material, tema), perguntas, tema);
        String sistema = PromptsIa.sistemaDoQuiz(opcoes);

        List<String> erros = List.of();
        for (int tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
            String mensagem = erros.isEmpty() ? pedido : pedido
                    + "\n\nSua resposta anterior foi recusada por estes problemas:\n- " + String.join("\n- ", erros)
                    + "\nGere o JSON completo de novo, corrigindo todos eles.";
            String resposta;
            try {
                resposta = llm.gerarJson(props.quiz(), sistema, mensagem);
            } catch (IaRespostaInvalida e) {
                erros = List.of("a resposta não era um JSON válido");
                continue;
            }
            List<Pergunta> validas = new ArrayList<>();
            List<String> problemas = new ArrayList<>();
            String titulo = validar(resposta, perguntas, opcoes, validas, problemas);
            if (problemas.isEmpty()) {
                validas.forEach(GeradorDeQuiz::embaralhar);
                return new Quiz(titulo, validas);
            }
            log.info("Quiz recusado na tentativa {}: {}", tentativa, problemas);
            erros = problemas;
        }
        throw new AiUnavailableException("A IA não conseguiu montar um quiz válido agora. Tente novamente.");
    }

    /**
     * Ate o orcamento de caracteres. Com um tema, os trechos que mais falam dele
     * primeiro; sem tema, trechos espalhados pelo modulo inteiro para cobrir todos
     * os assuntos.
     */
    static List<Trecho> selecionar(List<Trecho> material, String tema) {
        List<Trecho> ordem;
        if (tema != null) {
            List<String> palavras = TextoIa.palavrasChave(tema, 15);
            ordem = material.stream()
                    .sorted(Comparator.comparingInt((Trecho t) -> -TextoIa.pontuar(t.texto(), palavras)))
                    .toList();
        } else {
            int cabem = Math.max(1, MAX_CARACTERES_MATERIAL / TextoIa.TAMANHO_TRECHO);
            if (material.size() <= cabem) {
                ordem = material;
            } else {
                ordem = new ArrayList<>();
                double passo = (double) material.size() / cabem;
                for (int i = 0; i < cabem; i++) {
                    ordem.add(material.get((int) (i * passo)));
                }
            }
        }
        return RagService.dentroDoOrcamento(ordem, MAX_CARACTERES_MATERIAL);
    }

    static String pedido(List<Trecho> material, int perguntas, String tema) {
        StringBuilder texto = new StringBuilder("Crie ").append(perguntas).append(" perguntas");
        if (tema != null) {
            texto.append(" com foco em: ").append(tema);
        }
        texto.append(".\n\nMATERIAL:\n");
        for (Trecho trecho : material) {
            texto.append("\n[Aula: ").append(trecho.lessonTitle()).append("]\n").append(trecho.texto()).append('\n');
        }
        return texto.toString();
    }

    /**
     * Confere o JSON e preenche {@code saida} com as perguntas validas.
     *
     * @return o titulo do quiz; os problemas encontrados vao para {@code problemas}
     */
    static String validar(String resposta, int perguntas, int opcoes, List<Pergunta> saida, List<String> problemas) {
        JsonNode raiz;
        try {
            raiz = JSON.readTree(extrairJson(resposta));
        } catch (Exception e) {
            problemas.add("JSON inválido");
            return null;
        }
        JsonNode lista = raiz.path("questions");
        if (!lista.isArray() || lista.isEmpty()) {
            problemas.add("o campo \"questions\" precisa ser uma lista com as perguntas");
            return null;
        }

        Set<String> enunciados = new HashSet<>();
        int n = 0;
        for (JsonNode p : lista) {
            n++;
            String texto = p.path("text").asText("").strip();
            JsonNode alternativas = p.path("options");
            if (texto.isEmpty()) {
                problemas.add("pergunta " + n + " sem enunciado");
                continue;
            }
            if (!alternativas.isArray() || alternativas.size() != opcoes) {
                problemas.add("pergunta " + n + " precisa de exatamente " + opcoes + " alternativas");
                continue;
            }
            List<Opcao> lidas = new ArrayList<>();
            Set<String> textos = new HashSet<>();
            int corretas = 0;
            String problema = null;
            for (JsonNode o : alternativas) {
                String alternativa = o.path("text").asText("").strip();
                JsonNode correta = o.path("isCorrect");
                if (alternativa.isEmpty()) {
                    problema = "pergunta " + n + " tem alternativa sem texto";
                } else if (!correta.isBoolean()) {
                    problema = "pergunta " + n + " precisa de isCorrect verdadeiro ou falso em todas as alternativas";
                } else if (!textos.add(alternativa.toLowerCase(Locale.ROOT))) {
                    problema = "pergunta " + n + " tem alternativas repetidas";
                } else if (PROIBIDAS.stream().anyMatch(alternativa.toLowerCase(Locale.ROOT)::contains)) {
                    problema = "pergunta " + n + " usa \"todas/nenhuma das anteriores\"";
                } else if (alternativa.toLowerCase(Locale.ROOT).matches("^(verdadeiro|falso)\\b.*")) {
                    problema = "pergunta " + n + " é de verdadeiro ou falso; faça uma pergunta com respostas diferentes";
                }
                if (problema != null) {
                    break;
                }
                corretas += correta.asBoolean() ? 1 : 0;
                lidas.add(new Opcao(alternativa, correta.asBoolean()));
            }
            if (problema == null && corretas != 1) {
                problema = "pergunta " + n + " precisa de exatamente 1 alternativa correta (tem " + corretas + ")";
            }
            if (problema == null && !enunciados.add(texto.toLowerCase(Locale.ROOT))) {
                problema = "pergunta " + n + " repete um enunciado anterior";
            }
            if (problema != null) {
                problemas.add(problema);
                continue;
            }
            if (saida.size() < perguntas) {
                saida.add(new Pergunta(texto, p.path("explanation").asText("").strip(), lidas));
            }
        }
        if (problemas.isEmpty() && saida.size() < perguntas) {
            problemas.add("foram pedidas " + perguntas + " perguntas e vieram " + saida.size());
        }
        String titulo = raiz.path("title").asText("").strip();
        return titulo.isEmpty() ? null : titulo;
    }

    /** Mesmo com o modo JSON, alguns modelos embrulham a resposta em ```json ... ```. */
    static String extrairJson(String texto) {
        int inicio = texto.indexOf('{');
        int fim = texto.lastIndexOf('}');
        if (inicio < 0 || fim <= inicio) {
            throw new IllegalArgumentException("sem JSON");
        }
        return texto.substring(inicio, fim + 1);
    }

    /**
     * LLMs tendem a por a correta sempre na mesma posicao. A ordem e embaralhada de
     * forma reproduzivel: a mesma pergunta sai sempre com a mesma ordem.
     */
    private static void embaralhar(Pergunta pergunta) {
        java.util.Collections.shuffle(pergunta.options(), new Random(pergunta.text().hashCode()));
    }
}
