package com.trainify.lms.exceptions;

import java.net.URI;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(org.springframework.mail.MailException.class)
    public ProblemDetail handleMailFailure(org.springframework.mail.MailException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.SERVICE_UNAVAILABLE,
                "Não foi possível enviar o e-mail. A equipe responsável precisa verificar o serviço de envio.");
        problem.setProperty("code", "EMAIL_DELIVERY_UNAVAILABLE");
        return problem;
    }

    @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)
    public ProblemDetail handleConflictingRecord(org.springframework.dao.DataIntegrityViolationException ex) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT,
                "Já existe um registro com estes dados. Atualize a página antes de tentar novamente.");
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail handleValidationExceptions(MethodArgumentNotValidException ex) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(HttpStatus.UNPROCESSABLE_ENTITY, "Validation failed");
        problemDetail.setType(URI.create("urn:problem-type:validation-error"));
        problemDetail.setTitle("Validation Error");

        var errors = ex.getBindingResult().getFieldErrors()
                .stream()
                .collect(Collectors.toMap(FieldError::getField, FieldError::getDefaultMessage, (m1, m2) -> m1 + ", " + m2));

        problemDetail.setProperty("errors", errors);
        return problemDetail;
    }

    /**
     * Sem este tratamento, qualquer registro inexistente virava erro 500 e o front
     * mostrava "erro inesperado" no lugar de "nao encontrado".
     */
    @ExceptionHandler(jakarta.persistence.EntityNotFoundException.class)
    public ProblemDetail handleEntityNotFound(jakarta.persistence.EntityNotFoundException ex) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
        problemDetail.setType(URI.create("urn:problem-type:not-found"));
        problemDetail.setTitle("Not Found");
        return problemDetail;
    }

    @ExceptionHandler(com.trainify.lms.ai.AiUnavailableException.class)
    public ProblemDetail handleAiUnavailable(com.trainify.lms.ai.AiUnavailableException ex) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(HttpStatus.SERVICE_UNAVAILABLE, ex.getMessage());
        problemDetail.setType(URI.create("urn:problem-type:ai-unavailable"));
        problemDetail.setTitle("AI Unavailable");
        return problemDetail;
    }

    @ExceptionHandler(com.trainify.lms.ai.AiContentMissingException.class)
    public ProblemDetail handleAiContentMissing(com.trainify.lms.ai.AiContentMissingException ex) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, ex.getMessage());
        problemDetail.setType(URI.create("urn:problem-type:ai-content-missing"));
        problemDetail.setTitle("AI Content Missing");
        return problemDetail;
    }

    @ExceptionHandler(TenantSelectionRequiredException.class)
    public ProblemDetail handleTenantSelectionRequired(TenantSelectionRequiredException ex) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, ex.getMessage());
        problemDetail.setType(URI.create("urn:problem-type:tenant-selection-required"));
        problemDetail.setTitle("Tenant Selection Required");
        problemDetail.setProperty("tenants", ex.getTenants());
        return problemDetail;
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ProblemDetail handleIllegalArgumentException(IllegalArgumentException ex) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, ex.getMessage());
        problemDetail.setType(URI.create("urn:problem-type:bad-request"));
        problemDetail.setTitle("Bad Request");
        return problemDetail;
    }

    @ExceptionHandler(AuthenticationException.class)
    public ProblemDetail handleAuthenticationException(AuthenticationException ex) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(
                HttpStatus.UNAUTHORIZED, "E-mail ou senha incorretos.");
        problemDetail.setType(URI.create("urn:problem-type:invalid-credentials"));
        problemDetail.setTitle("Authentication Failed");
        problemDetail.setProperty("code", "INVALID_CREDENTIALS");
        return problemDetail;
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ProblemDetail handleAccessDeniedException(AccessDeniedException ex) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(
                HttpStatus.FORBIDDEN, "Usuário sem permissão para acessar a plataforma.");
        problemDetail.setType(URI.create("urn:problem-type:access-denied"));
        problemDetail.setTitle("Access Denied");
        problemDetail.setProperty("code", "ACCESS_DENIED");
        return problemDetail;
    }

    // 403 com tipo proprio para o frontend distinguir de falta de permissao
    @ExceptionHandler(LessonLockedException.class)
    public ProblemDetail handleLessonLockedException(LessonLockedException ex) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(HttpStatus.FORBIDDEN, ex.getMessage());
        problemDetail.setType(URI.create("urn:problem-type:lesson-locked"));
        problemDetail.setTitle("Lesson Locked");
        return problemDetail;
    }

    @ExceptionHandler(AssessmentAttemptsExhaustedException.class)
    public ProblemDetail handleAssessmentAttemptsExhausted(AssessmentAttemptsExhaustedException ex) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, ex.getMessage());
        problemDetail.setType(URI.create("urn:problem-type:assessment-attempts-exhausted"));
        problemDetail.setTitle("Assessment Attempts Exhausted");
        return problemDetail;
    }

    // Outros handlers podem ser adicionados conforme a necessidade (ex: AccessDeniedException para 403)
}
