package com.trainify.lms.controllers;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoint publico e leve, usado para checar se a API esta no ar e para evitar
 * que o servico hiberne no plano gratuito do Render. O horario de inicio mostra
 * se o servico acabou de subir, o que ajuda a confirmar um deploy.
 */
@RestController
@RequestMapping("/api/v1/health")
public class HealthController {

    private final Instant startedAt = Instant.now();

    @GetMapping
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "time", Instant.now().toString(),
                "startedAt", startedAt.toString(),
                "uptimeSeconds", String.valueOf(Duration.between(startedAt, Instant.now()).toSeconds())
        ));
    }
}
