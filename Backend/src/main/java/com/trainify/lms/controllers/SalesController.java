package com.trainify.lms.controllers;

import com.trainify.lms.dto.SalesRequest;
import com.trainify.lms.services.SalesRateLimiter;
import com.trainify.lms.services.SalesService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class SalesController {
    private final SalesService service;
    private final SalesRateLimiter limiter;
    public record StatusRequest(@NotNull SalesService.Status status) {}

    @PostMapping("/public/sales-requests")
    public ResponseEntity<?> create(@Valid @RequestBody SalesRequest request, HttpServletRequest http) {
        if (!limiter.allow(http.getRemoteAddr())) {
            return ResponseEntity.status(429).header("Retry-After", "60")
                    .body(Map.of("message", "Aguarde um minuto antes de tentar novamente."));
        }
        return ResponseEntity.status(201).body(Map.of("id", service.create(request)));
    }

    @GetMapping("/sales-requests")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<?> list(@RequestParam(defaultValue = "0") int page) {
        if (page < 0) return ResponseEntity.badRequest().build();
        return ResponseEntity.ok().header("Cache-Control", "no-store").body(service.list(page));
    }

    @PatchMapping("/sales-requests/{id}/status")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Void> update(@PathVariable UUID id, @Valid @RequestBody StatusRequest request) {
        service.updateStatus(id, request.status());
        return ResponseEntity.noContent().build();
    }
}
