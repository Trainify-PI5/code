package com.trainify.lms.controllers;

import com.trainify.lms.ai.AiUnavailableException;
import com.trainify.lms.ai.RagService;
import io.github.resilience4j.circuitbreaker.CallNotPermittedException;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Chat do assistente. O frontend nunca fala direto com o servico de IA: tudo
 * passa por aqui, onde se descobre quem pergunta e quais cursos pode consultar.
 */
@RestController
@RequestMapping("/api/v1/ia")
@RequiredArgsConstructor
@Slf4j
public class IaProxyController {

    private final RagService ragService;

    @PostMapping("/chat")
    @PreAuthorize("isAuthenticated()")
    @CircuitBreaker(name = "iaChat", fallbackMethod = "chatFallback")
    public ResponseEntity<RagService.RespostaChat> chat(@RequestBody ChatRequestDto request) {
        return ResponseEntity.ok(ragService.chat(
                request.getQuery(),
                request.getHistory(),
                paraUuid(request.getLessonId()),
                paraUuid(request.getCourseId())));
    }

    /**
     * So falhas do servico de IA caem aqui. Erros do pedido (aula de outro curso,
     * pergunta vazia) seguem como erro normal, para nao virarem "tente mais tarde".
     */
    public ResponseEntity<RagService.RespostaChat> chatFallback(ChatRequestDto request, AiUnavailableException e) {
        log.warn("Assistente indisponivel: {}", e.getMessage());
        return ResponseEntity.ok(new RagService.RespostaChat(e.getMessage(), List.of()));
    }

    public ResponseEntity<RagService.RespostaChat> chatFallback(ChatRequestDto request, CallNotPermittedException e) {
        return ResponseEntity.ok(new RagService.RespostaChat(
                "O assistente está indisponível no momento. Tente novamente em alguns instantes.", List.of()));
    }

    private static UUID paraUuid(String valor) {
        if (valor == null || valor.isBlank()) {
            return null;
        }
        try {
            return UUID.fromString(valor);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Identificador inválido: " + valor);
        }
    }

    @Data
    public static class ChatRequestDto {
        private String query;
        private String courseId;
        private String lessonId;
        /** Mensagens anteriores da conversa, da mais antiga para a mais recente. */
        private List<RagService.Mensagem> history;
    }
}
