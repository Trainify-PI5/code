package com.trainify.lms.services;

import com.trainify.lms.domain.entities.Notification;
import com.trainify.lms.dto.NotificationDto;
import com.trainify.lms.repositories.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import jakarta.persistence.EntityNotFoundException;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    
    // Registry de conexões SSE em memória
    private final Map<UUID, SseEmitter> userEmitters = new ConcurrentHashMap<>();

    public SseEmitter subscribe(UUID userId) {
        // Timeout longo, ex: 30 minutos
        SseEmitter emitter = new SseEmitter(30 * 60 * 1000L);
        userEmitters.put(userId, emitter);

        emitter.onCompletion(() -> userEmitters.remove(userId, emitter));
        emitter.onTimeout(() -> {
            emitter.complete();
            userEmitters.remove(userId, emitter);
        });
        emitter.onError((e) -> {
            emitter.completeWithError(e);
            userEmitters.remove(userId, emitter);
        });

        // Envia evento inicial para forçar headers e evitar timeout imediato no proxy
        try {
            emitter.send(SseEmitter.event().name("init").data("connected"));
        } catch (IOException e) {
            userEmitters.remove(userId, emitter);
        }

        return emitter;
    }

    @Transactional(readOnly = true)
    public List<NotificationDto> getUserNotifications(UUID userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public void markAsRead(UUID id, UUID userId) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Notification not found"));
        if (!notification.getUser().getId().equals(userId)) {
            throw new org.springframework.security.access.AccessDeniedException("Notification does not belong to user");
        }
        notification.setRead(true);
        notificationRepository.save(notification);
    }

    @Transactional
    public void createAndSendNotification(Notification notification) {
        Notification saved = notificationRepository.save(notification);
        NotificationDto dto = mapToDto(saved);

        SseEmitter emitter = userEmitters.get(notification.getUser().getId());
        if (emitter != null) {
            try {
                emitter.send(SseEmitter.event().name("notification").data(dto));
            } catch (IOException e) {
                userEmitters.remove(notification.getUser().getId(), emitter);
            }
        }
    }

    private NotificationDto mapToDto(Notification notification) {
        NotificationDto dto = new NotificationDto();
        dto.setId(notification.getId());
        dto.setType(notification.getType());
        dto.setTitle(notification.getTitle());
        dto.setMessage(notification.getMessage());
        dto.setRead(notification.isRead());
        dto.setReferenceId(notification.getReferenceId());
        dto.setCreatedAt(notification.getCreatedAt());
        return dto;
    }
}
