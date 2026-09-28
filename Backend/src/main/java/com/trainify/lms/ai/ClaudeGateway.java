package com.trainify.lms.ai;

/**
 * Porta de saida para o modelo de linguagem. Existe para que os servicos de IA
 * possam ser testados sem chamar a API de verdade.
 */
public interface ClaudeGateway {

    /** Informa se a chave da API foi configurada neste ambiente. */
    boolean isEnabled();

    /**
     * Envia uma instrucao de sistema e uma pergunta, devolvendo o texto da resposta.
     *
     * @param system  papel e regras do assistente
     * @param message pergunta ou conteudo a ser processado
     */
    String complete(String system, String message);
}
