package com.trainify.lms.ai;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.errors.AnthropicServiceException;
import com.anthropic.models.messages.Message;
import com.anthropic.models.messages.MessageCreateParams;
import com.anthropic.models.messages.TextBlockParam;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;

/**
 * Conversa com a API da Anthropic. Sem a chave configurada o recurso fica
 * desligado e quem chama recebe uma mensagem clara, em vez de um erro tecnico.
 */
@Component
@Slf4j
public class AnthropicClaudeGateway implements ClaudeGateway {

    @Value("${app.ai.claude.api-key:}")
    private String apiKey;

    @Value("${app.ai.claude.model:claude-opus-5}")
    private String model;

    @Value("${app.ai.claude.max-tokens:8000}")
    private long maxTokens;

    private AnthropicClient client;

    @PostConstruct
    void init() {
        if (isEnabled()) {
            client = AnthropicOkHttpClient.builder().apiKey(apiKey).build();
            log.info("Recursos de IA ativos com o modelo {}", model);
        } else {
            log.warn("ANTHROPIC_API_KEY nao configurada: os recursos de IA ficarao indisponiveis");
        }
    }

    @Override
    public boolean isEnabled() {
        return apiKey != null && !apiKey.isBlank();
    }

    @Override
    public String complete(String system, String message) {
        if (!isEnabled()) {
            throw new AiUnavailableException("Os recursos de inteligência artificial não estão configurados neste ambiente.");
        }

        MessageCreateParams params = MessageCreateParams.builder()
                .model(model)
                .maxTokens(maxTokens)
                .systemOfTextBlockParams(List.of(TextBlockParam.builder().text(system).build()))
                .addUserMessage(message)
                .build();

        try {
            Message response = client.messages().create(params);
            String texto = response.content().stream()
                    .flatMap(block -> block.text().stream())
                    .map(block -> block.text())
                    .reduce("", (a, b) -> a + b)
                    .trim();

            if (texto.isBlank()) {
                throw new AiUnavailableException("O assistente não conseguiu responder desta vez. Tente novamente.");
            }
            return texto;
        } catch (AnthropicServiceException e) {
            log.error("Falha ao chamar a API da Anthropic: {}", e.getMessage());
            throw new AiUnavailableException("O assistente está indisponível no momento. Tente novamente em instantes.");
        }
    }
}
