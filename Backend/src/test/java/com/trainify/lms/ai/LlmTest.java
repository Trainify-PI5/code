package com.trainify.lms.ai;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.MessageType;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.ai.openai.api.ResponseFormat;
import org.springframework.ai.retry.NonTransientAiException;

class LlmTest {

    private final IaProperties.Tarefa gptOss = new IaProperties.Tarefa("openai/gpt-oss-20b", 0.3, 1500, "low");

    @Test
    void montaAsMensagensNaOrdemDoNotebookSistemaHistoricoEPergunta() {
        LlmFalsa modelo = new LlmFalsa().responde("Resposta.");
        List<Message> historico = List.of(new UserMessage("Oi"), new AssistantMessage("Olá!"));

        String resposta = modelo.llm().conversar(gptOss, "Você é um tutor.", historico, "O que é EPI?");

        assertEquals("Resposta.", resposta);
        List<Message> enviadas = modelo.ultimo().getInstructions();
        assertEquals(List.of(MessageType.SYSTEM, MessageType.USER, MessageType.ASSISTANT, MessageType.USER),
                enviadas.stream().map(Message::getMessageType).toList());
        assertEquals("Você é um tutor.", enviadas.get(0).getText());
        assertEquals("O que é EPI?", enviadas.get(3).getText());
    }

    /** Material de aula com chaves nao pode ser tratado como template. */
    @Test
    void textoComChavesChegaIntacto() {
        LlmFalsa modelo = new LlmFalsa().responde("ok");
        String material = "Exemplo de JSON: {\"nome\": \"valor\"} e {variavel}";

        modelo.llm().gerarTexto(gptOss, "Sistema {x}", material);

        assertEquals(material, modelo.ultimo().getInstructions().get(1).getText());
        assertEquals("Sistema {x}", modelo.ultimo().getInstructions().get(0).getText());
    }

    @Test
    void opcoesLevamOsParametrosDoModelo() {
        OpenAiChatOptions opcoes = Llm.opcoes(gptOss, false);

        assertEquals("openai/gpt-oss-20b", opcoes.getModel());
        assertEquals(0.3, opcoes.getTemperature());
        assertEquals(1500, opcoes.getMaxCompletionTokens());
        assertEquals("low", opcoes.getReasoningEffort());
        assertEquals(Map.of("include_reasoning", false), opcoes.getExtraBody());
        assertNull(opcoes.getResponseFormat());
    }

    @Test
    void modoJsonEModeloSemRaciocinio() {
        OpenAiChatOptions opcoes = Llm.opcoes(new IaProperties.Tarefa("qwen/qwen3.8-27b", 0.0, 500, "none"), true);

        assertEquals(ResponseFormat.Type.JSON_OBJECT, opcoes.getResponseFormat().getType());
        assertEquals("none", opcoes.getReasoningEffort());
        assertTrue(opcoes.getExtraBody() == null || opcoes.getExtraBody().isEmpty());
    }

    @Test
    void semChaveNaoChamaALlm() {
        LlmFalsa modelo = new LlmFalsa();
        Llm llm = new Llm(ChatClient.builder(modelo), new IaProperties("", null, null, null, null));

        assertFalse(llm.configurada());
        assertThrows(AiUnavailableException.class, () -> llm.gerarTexto(gptOss, "s", "m"));
        assertTrue(modelo.recebidos.isEmpty());
    }

    @Test
    void respostaVaziaEInvalida() {
        LlmFalsa modelo = new LlmFalsa().responde("   ");
        assertThrows(IaRespostaInvalida.class, () -> modelo.llm().gerarTexto(gptOss, "s", "m"));
    }

    @Test
    void errosDaGroqViramMensagensParaATela() {
        assertInstanceOf(IaLimiteAtingido.class,
                Llm.traduzir(new NonTransientAiException("HTTP 429 - {\"error\":{\"code\":\"rate_limit_exceeded\"}}")));
        assertInstanceOf(IaRespostaInvalida.class,
                Llm.traduzir(new NonTransientAiException("HTTP 400 - {\"error\":{\"code\":\"json_validate_failed\"}}")));
        RuntimeException grande = Llm.traduzir(new NonTransientAiException("HTTP 413 - Request too large for model"));
        assertTrue(grande.getMessage().contains("grandes demais"));
        RuntimeException outro = Llm.traduzir(new IllegalStateException("conexao recusada"));
        assertEquals(AiUnavailableException.class, outro.getClass());
    }

    @Test
    void falhaDaChamadaETraduzida() {
        LlmFalsa modelo = new LlmFalsa().falha(new NonTransientAiException("HTTP 429 - rate_limit_exceeded"));
        assertThrows(IaLimiteAtingido.class, () -> modelo.llm().gerarTexto(gptOss, "s", "m"));
    }
}
