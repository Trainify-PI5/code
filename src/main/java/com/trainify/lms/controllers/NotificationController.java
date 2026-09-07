package com.trainify.lms.controllers;

import com.trainify.lms.dto.NotificationDto;
import com.trainify.lms.security.CustomUserDetails;
import com.trainify.lms.services.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(@AuthenticationPrincipal CustomUserDetails principal) {
        return notificationService.subscribe(principal.getId());
    }

    @GetMapping
    public ResponseEntity<List<NotificationDto>> getNotifications(@AuthenticationPrincipal CustomUserDetails principal) {
        return ResponseEntity.ok(notificationService.getUserNotifications(principal.getId()));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<Void> markAsRead(@PathVariable UUID id, @AuthenticationPrincipal CustomUserDetails principal) {
        notificationService.markAsRead(id, principal.getId());
        return ResponseEntity.noContent().build();
    }
}
