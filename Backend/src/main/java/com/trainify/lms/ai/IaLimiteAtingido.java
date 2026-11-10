package com.trainify.lms.ai;

/**
 * A Groq recusou o pedido por limite de uso (HTTP 429): pedidos ou tokens por
 * minuto da conta gratuita. Passa sozinho em alguns segundos.
 */
public class IaLimiteAtingido extends AiUnavailableException {

    public IaLimiteAtingido(String message) {
        super(message);
    }
}
