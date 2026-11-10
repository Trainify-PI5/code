package com.trainify.lms.ai;

/**
 * A LLM respondeu, mas a resposta nao serve: veio vazia ou, quando se pediu
 * JSON, o JSON nao e valido. Quem pediu pode tentar de novo.
 */
public class IaRespostaInvalida extends AiUnavailableException {

    public IaRespostaInvalida(String message) {
        super(message);
    }
}
