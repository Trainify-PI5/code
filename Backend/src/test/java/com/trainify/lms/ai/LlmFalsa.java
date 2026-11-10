package com.trainify.lms.ai;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.function.Supplier;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.model.Generation;
import org.springframework.ai.chat.prompt.Prompt;

/**
 * LLM de mentira para os testes: devolve respostas programadas, em ordem, e
 * guarda os prompts recebidos. Nenhum teste chama a Groq de verdade.
 */
class LlmFalsa implements ChatModel {

    final List<Prompt> recebidos = new ArrayList<>();
    private final Deque<Supplier<String>> respostas = new ArrayDeque<>();

    /** Proxima resposta em texto. */
    LlmFalsa responde(String... textos) {
        for (String texto : textos) {
            respostas.add(() -> texto);
        }
        return this;
    }

    /** Proxima chamada falha com esta excecao (como o Spring AI faria). */
    LlmFalsa falha(RuntimeException erro) {
        respostas.add(() -> {
            throw erro;
        });
        return this;
    }

    @Override
    public ChatResponse call(Prompt prompt) {
        recebidos.add(prompt);
        if (respostas.isEmpty()) {
            throw new AssertionError("a LLM foi chamada mais vezes do que o teste previa");
        }
        String texto = respostas.poll().get();
        return new ChatResponse(List.of(new Generation(new AssistantMessage(texto))));
    }

    Prompt ultimo() {
        return recebidos.get(recebidos.size() - 1);
    }

    /** O {@link Llm} de verdade, com a chave "configurada" e esta LLM por baixo. */
    Llm llm() {
        return new Llm(ChatClient.builder(this), propriedades());
    }

    static IaProperties propriedades() {
        return new IaProperties("chave-de-teste", null, null, null, null);
    }
}
