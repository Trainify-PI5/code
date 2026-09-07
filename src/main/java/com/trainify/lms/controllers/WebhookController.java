package com.trainify.lms.controllers;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.trainify.lms.domain.entities.MediaAsset;
import com.trainify.lms.domain.entities.Notification;
import com.trainify.lms.domain.enums.TranscriptionStatus;
import com.trainify.lms.repositories.MediaAssetRepository;
import com.trainify.lms.services.NotificationService;
import lombok.Data;
import lombok.RequiredArgsConstructor;

import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/webhooks")
@RequiredArgsConstructor
public class WebhookController {

    private final MediaAssetRepository mediaAssetRepository;
    private final NotificationService notificationService;

    @Value("${app.ai.service-token:token_super_secreto_compartilhado_com_java}")
    private String aiServiceToken;

    @PostMapping("/ia/suggestions")
    public ResponseEntity<Void> receiveSuggestionWebhook(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody Map<String, Object> payload) {
        
        if (authHeader == null || !authHeader.equals("Bearer " + aiServiceToken)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        log.info("Recebido webhook do Celery: {}", payload);
        // Lógica para persistir o suggestionText recebido do Worker
        
        return ResponseEntity.ok().build();
    }

    @PostMapping("/ia/transcriptions")
    public ResponseEntity<Void> receiveTranscriptionWebhook(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody TranscriptionWebhookPayload payload) {
        
        if (authHeader == null || !authHeader.equals("Bearer " + aiServiceToken)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        UUID mediaAssetId;
        try {
            mediaAssetId = UUID.fromString(payload.getMediaAssetId());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }

        MediaAsset mediaAsset = mediaAssetRepository.findById(mediaAssetId)
                .orElse(null);

        if (mediaAsset == null) {
            log.warn("Webhook recebido para MediaAsset desconhecido: {}", mediaAssetId);
            return ResponseEntity.notFound().build();
        }

        if ("COMPLETED".equals(payload.getStatus())) {
            mediaAsset.setTranscriptionStatus(TranscriptionStatus.COMPLETED);
            mediaAsset.setSubtitlesUrl(payload.getSubtitlesUrl());
        } else {
            mediaAsset.setTranscriptionStatus(TranscriptionStatus.FAILED);
        }
        mediaAssetRepository.save(mediaAsset);

        // Notificar instrutor (se vinculado) ou avisar que terminou
        if (mediaAsset.getCourse() != null && mediaAsset.getCourse().getInstructor() != null) {
            Notification notification = new Notification();
            notification.setTenant(mediaAsset.getTenant());
            notification.setUser(mediaAsset.getCourse().getInstructor());
            notification.setType("TRANSCRIPTION_" + payload.getStatus());
            notification.setTitle("Transcrição " + (payload.getStatus().equals("COMPLETED") ? "Concluída" : "Falhou"));
            notification.setMessage("A legenda do vídeo '" + mediaAsset.getOriginalFilename() + "' foi gerada.");
            notification.setReferenceId(mediaAssetId);
            
            notificationService.createAndSendNotification(notification);
        } else {
            log.info("MediaAsset {} não tem curso vinculado para notificar.", mediaAssetId);
        }

        return ResponseEntity.ok().build();
    }

    @Data
    public static class TranscriptionWebhookPayload {
        private String mediaAssetId;
        private String status;
        private String text;
        private String subtitlesUrl;
        private String tenantId;
    }
}
