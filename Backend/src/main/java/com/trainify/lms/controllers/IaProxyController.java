package com.trainify.lms.controllers;

import com.trainify.lms.security.CustomUserDetails;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/ia")
@RequiredArgsConstructor
@Slf4j
public class IaProxyController {

    private final com.trainify.lms.ai.AiService aiService;

    @PostMapping("/chat")
    @PreAuthorize("isAuthenticated()")
    @CircuitBreaker(name = "iaChat", fallbackMethod = "chatFallback")
    public ResponseEntity<Map<String, String>> chat(
            @RequestBody ChatRequestDto request,
            @AuthenticationPrincipal CustomUserDetails user) {
        
        java.util.UUID lessonId = request.getLessonId() == null || request.getLessonId().isBlank()
                ? null
                : java.util.UUID.fromString(request.getLessonId());

        return ResponseEntity.ok(Map.of("response", aiService.tutor(lessonId, request.getQuery())));
    }

    public ResponseEntity<Map<String, String>> chatFallback(ChatRequestDto request, CustomUserDetails user, Throwable t) {
        log.warn("Fallback acionado para chat IA. Erro: {}", t.getMessage());
        return ResponseEntity.ok(Map.of("response", "O assistente inteligente está indisponível no momento devido ao alto volume de acessos. Por favor, tente novamente em alguns instantes."));
    }

    @Data
    public static class ChatRequestDto {
        private String query;
        private String courseId;
        private String lessonId;
    }
}
