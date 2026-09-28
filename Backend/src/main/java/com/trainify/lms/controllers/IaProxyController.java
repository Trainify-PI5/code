package com.trainify.lms.controllers;

import com.trainify.lms.clients.IaServiceClient;
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

    private final IaServiceClient iaServiceClient;
    private final com.trainify.lms.repositories.LessonRepository lessonRepository;

    @PostMapping("/chat")
    @PreAuthorize("isAuthenticated()")
    @CircuitBreaker(name = "iaChat", fallbackMethod = "chatFallback")
    public ResponseEntity<Map<String, String>> chat(
            @RequestBody ChatRequestDto request,
            @AuthenticationPrincipal CustomUserDetails user) {
        
        IaServiceClient.ChatRequest chatRequest = new IaServiceClient.ChatRequest(
                request.getQuery(),
                user.getTenantId().toString(),
                request.getCourseId()
        );

        // Contexto da aula que o aluno esta assistindo, quando o front informa
        if (request.getLessonId() != null && !request.getLessonId().isBlank()) {
            lessonRepository.findById(java.util.UUID.fromString(request.getLessonId()))
                    .filter(lesson -> lesson.getTenant().getId().equals(user.getTenantId()))
                    .ifPresent(lesson -> {
                        chatRequest.lesson_id = lesson.getId().toString();
                        chatRequest.lesson_title = lesson.getTitle();
                        chatRequest.lesson_content = lesson.getContent();
                        if (chatRequest.course_id == null && lesson.getModule() != null
                                && lesson.getModule().getCourse() != null) {
                            chatRequest.course_id = lesson.getModule().getCourse().getId().toString();
                        }
                    });
        }

        IaServiceClient.ChatResponse response = iaServiceClient.chat(chatRequest);

        return ResponseEntity.ok(Map.of("response", response.response));
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
