package com.trainify.lms.exceptions;

import com.trainify.lms.ai.AiContentMissingException;
import com.trainify.lms.ai.AiUnavailableException;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.security.access.AccessDeniedException;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/**
 * O site decide o que mostrar a partir do campo "type" da resposta de erro:
 * pedir a empresa, avisar que as tentativas acabaram, mandar a pessoa se
 * matricular. Mudar um desses textos quebra a tela sem quebrar compilacao
 * nenhuma, por isso o contrato fica fixado aqui.
 */
class ContratoDeErrosTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    private void confere(ProblemDetail problema, HttpStatus status, String tipo) {
        assertEquals(status.value(), problema.getStatus());
        assertNotNull(problema.getType());
        assertEquals(tipo, problema.getType().toString());
        assertNotNull(problema.getDetail(), "sem detail o site nao tem o que mostrar");
    }

    @Test
    void registroInexistenteE404ENao500() {
        confere(handler.handleEntityNotFound(new EntityNotFoundException("Curso não encontrado")),
                HttpStatus.NOT_FOUND, "urn:problem-type:not-found");
    }

    @Test
    void semPermissaoE403() {
        confere(handler.handleAccessDeniedException(new AccessDeniedException("sem acesso")),
                HttpStatus.FORBIDDEN, "urn:problem-type:access-denied");
    }

    @Test
    void aulaBloqueadaTemTipoProprioParaNaoSerConfundidaComFaltaDePermissao() {
        confere(handler.handleLessonLockedException(new LessonLockedException(UUID.randomUUID())),
                HttpStatus.FORBIDDEN, "urn:problem-type:lesson-locked");
    }

    @Test
    void tentativasEsgotadasE409() {
        confere(handler.handleAssessmentAttemptsExhausted(
                        new AssessmentAttemptsExhaustedException("Você já usou as 3 tentativas.")),
                HttpStatus.CONFLICT, "urn:problem-type:assessment-attempts-exhausted");
    }

    @Test
    void contaEmVariasEmpresasDevolve409ComALista() {
        var excecao = new TenantSelectionRequiredException(List.of(
                new TenantSelectionRequiredException.TenantOption(UUID.randomUUID(), "Empresa A"),
                new TenantSelectionRequiredException.TenantOption(UUID.randomUUID(), "Empresa B")));

        var problema = handler.handleTenantSelectionRequired(excecao);

        confere(problema, HttpStatus.CONFLICT, "urn:problem-type:tenant-selection-required");
        assertNotNull(problema.getProperties().get("tenants"),
                "sem a lista a tela nao tem o que oferecer para escolher");
    }

    @Test
    void iaDesligadaE503ESemConteudoE400() {
        confere(handler.handleAiUnavailable(new AiUnavailableException("IA indisponível")),
                HttpStatus.SERVICE_UNAVAILABLE, "urn:problem-type:ai-unavailable");

        confere(handler.handleAiContentMissing(new AiContentMissingException("Aula sem conteúdo")),
                HttpStatus.BAD_REQUEST, "urn:problem-type:ai-content-missing");
    }

    @Test
    void credenciaisInvalidasE401() {
        confere(handler.handleAuthenticationException(
                        new org.springframework.security.authentication.BadCredentialsException("ruim")),
                HttpStatus.UNAUTHORIZED, "urn:problem-type:invalid-credentials");
    }

    @Test
    void erroInesperadoCarregaUmCodigoParaAcharNoLog() {
        var problema = handler.handleUnexpected(new IllegalStateException("algo quebrou"));

        confere(problema, HttpStatus.INTERNAL_SERVER_ERROR, "urn:problem-type:internal-error");
        assertNotNull(problema.getProperties().get("reference"));
    }

    @Test
    void erroQueJaCarregaOProprioStatusPassaIntacto() {
        // Sem isto o tratamento geral transformaria 405, 415 e afins em 500
        var problema = handler.handleUnexpected(
                new org.springframework.web.HttpRequestMethodNotSupportedException("DELETE"));

        assertEquals(HttpStatus.METHOD_NOT_ALLOWED.value(), problema.getStatus());
    }

    @Test
    void dadosIlegiveisSaoErroDeQuemChamou() {
        var problema = handler.handleRequisicaoIlegivel(
                new org.springframework.http.converter.HttpMessageNotReadableException(
                        "json quebrado", (Throwable) null, null));

        assertEquals(HttpStatus.BAD_REQUEST.value(), problema.getStatus());
    }
}
