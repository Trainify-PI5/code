package com.trainify.lms.ai;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.ai.openai.api.ResponseFormat;
import org.springframework.stereotype.Component;

import lombok.extern.slf4j.Slf4j;

/**
 * O unico ponto do sistema que fala com a LLM (Groq, pelo Spring AI).
 *
 * <p>Cada chamada monta a mesma lista de mensagens do notebook da disciplina:
 * uma mensagem de sistema (o papel do assistente), o historico da conversa e a
 * mensagem do usuario. As opcoes do modelo (modelo, temperatura, max tokens,
 * raciocinio) vem da {@link IaProperties.Tarefa} de cada recurso.
 *
 * <p>As mensagens vao prontas para o modelo, sem passar pelo motor de templates do
 * Spring AI: o material das aulas pode ter chaves ({ }) que o template tentaria
 * interpretar.
 */
@Component
@Slf4j
public class Llm {

    private final ChatClient chatClient;
    private final IaProperties props;

    public Llm(ChatClient.Builder builder, IaProperties props) {
        this.chatClient = builder.build();
        this.props = props;
    }

    public boolean configurada() {
        return props.configurada();
    }

    /** Chat: sistema + historico + pergunta. */
    public String conversar(IaProperties.Tarefa tarefa, String sistema, List<Message> historico, String mensagem) {
        return gerar(tarefa, sistema, historico, mensagem, false);
    }

    /** Texto livre (ex.: o texto de uma aula). */
    public String gerarTexto(IaProperties.Tarefa tarefa, String sistema, String mensagem) {
        return gerar(tarefa, sistema, List.of(), mensagem, false);
    }

    /**
     * Pede a resposta em JSON. Alem de pedir no prompt (como no notebook), liga o
     * "modo JSON" da API ({@code response_format: json_object}): a Groq recusa
     * a resposta se ela nao for um JSON valido.
     */
    public String gerarJson(IaProperties.Tarefa tarefa, String sistema, String mensagem) {
        return gerar(tarefa, sistema, List.of(), mensagem, true);
    }

    private String gerar(IaProperties.Tarefa tarefa, String sistema, List<Message> historico, String mensagem, boolean json) {
        if (!configurada()) {
            throw new AiUnavailableException("O assistente de IA não está configurado neste ambiente.");
        }

        List<Message> mensagens = new ArrayList<>();
        mensagens.add(new SystemMessage(sistema));
        mensagens.addAll(historico);
        mensagens.add(new UserMessage(mensagem));

        ChatResponse resposta;
        try {
            resposta = chatClient.prompt(new Prompt(mensagens, opcoes(tarefa, json))).call().chatResponse();
        } catch (RuntimeException e) {
            throw traduzir(e);
        }

        String texto = resposta == null || resposta.getResult() == null || resposta.getResult().getOutput() == null
                ? null : resposta.getResult().getOutput().getText();
        if (texto == null || texto.isBlank()) {
            // Os modelos que raciocinam gastam parte do limite de tokens "pensando";
            // se o limite acaba antes, a resposta vem vazia.
            String motivo = resposta == null || resposta.getResult() == null ? null
                    : resposta.getResult().getMetadata().getFinishReason();
            log.warn("A LLM devolveu resposta vazia (modelo {}, motivo {})", tarefa.modelo(), motivo);
            throw new IaRespostaInvalida("A IA não conseguiu montar a resposta agora. Tente novamente.");
        }
        return texto.strip();
    }

    /** Os mesmos parametros do notebook, no formato do Spring AI. */
    static OpenAiChatOptions opcoes(IaProperties.Tarefa tarefa, boolean json) {
        OpenAiChatOptions.Builder opcoes = OpenAiChatOptions.builder()
                .model(tarefa.modelo())
                .temperature(tarefa.temperatura())
                .maxCompletionTokens(tarefa.maxTokens());

        if (tarefa.raciocinio() != null && !tarefa.raciocinio().isBlank()) {
            opcoes.reasoningEffort(tarefa.raciocinio());
        }

        Map<String, Object> extras = new HashMap<>();
        if (tarefa.modelo() != null && tarefa.modelo().startsWith("openai/gpt-oss")) {
            // O raciocinio dos gpt-oss vem num campo a parte que nao usamos: nao
            // precisa trafegar.
            extras.put("include_reasoning", false);
        }
        if (!extras.isEmpty()) {
            opcoes.extraBody(extras);
        }

        if (json) {
            opcoes.responseFormat(ResponseFormat.builder().type(ResponseFormat.Type.JSON_OBJECT).build());
        }
        return opcoes.build();
    }

    /** Converte as falhas da Groq em mensagens que a tela sabe mostrar. */
    static RuntimeException traduzir(RuntimeException e) {
        if (e instanceof AiUnavailableException jaTraduzida) {
            return jaTraduzida;
        }
        String detalhe = String.valueOf(e.getMessage());
        String minusculo = detalhe.toLowerCase();

        if (minusculo.contains("json_validate_failed")) {
            return new IaRespostaInvalida("A IA devolveu um JSON inválido.");
        }
        if (minusculo.contains("429") || minusculo.contains("rate_limit") || minusculo.contains("rate limit")) {
            return new IaLimiteAtingido("Muitas perguntas em pouco tempo. Aguarde alguns segundos e tente de novo.");
        }
        if (minusculo.contains("413") || minusculo.contains("request too large")
                || minusculo.contains("context_length") || minusculo.contains("reduce the length")) {
            log.warn("Pedido grande demais para a LLM: {}", detalhe);
            return new AiUnavailableException(
                    "A pergunta e o material ficaram grandes demais para a IA. Tente uma pergunta mais curta.");
        }
        if (minusculo.contains("401") || minusculo.contains("invalid_api_key") || minusculo.contains("invalid api key")) {
            log.error("A Groq recusou a chave: confira a variavel GROQ_API_KEY");
            return new AiUnavailableException("O assistente está indisponível no momento.");
        }
        if (minusculo.contains("model_not_found") || minusculo.contains("model_decommissioned")
                || minusculo.contains("does not exist")) {
            log.error("Modelo da Groq indisponivel: {}", detalhe);
            return new AiUnavailableException("O modelo de IA configurado não está disponível.");
        }
        log.warn("Falha ao chamar a LLM: {}", detalhe);
        return new AiUnavailableException("A IA não respondeu agora. Tente novamente em instantes.");
    }
}
