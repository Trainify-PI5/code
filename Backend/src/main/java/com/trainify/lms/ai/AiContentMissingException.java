package com.trainify.lms.ai;

/** A aula nao tem texto nem transcricao, entao nao ha o que a IA possa usar. */
public class AiContentMissingException extends RuntimeException {

    public AiContentMissingException(String message) {
        super(message);
    }
}
