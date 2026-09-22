package com.trainify.lms.exceptions;

/** Lancada quando o aluno ja usou todas as tentativas permitidas na avaliacao. */
public class AssessmentAttemptsExhaustedException extends RuntimeException {

    public AssessmentAttemptsExhaustedException(String message) {
        super(message);
    }
}
