package com.trainify.lms.ai;

/** O recurso de IA nao esta configurado ou o servico nao respondeu. */
public class AiUnavailableException extends RuntimeException {

    public AiUnavailableException(String message) {
        super(message);
    }
}
