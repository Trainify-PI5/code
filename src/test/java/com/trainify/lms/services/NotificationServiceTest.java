package com.trainify.lms.services;

import com.trainify.lms.domain.entities.Notification;
import com.trainify.lms.domain.entities.User;

import com.trainify.lms.dto.NotificationDto;
import com.trainify.lms.repositories.NotificationRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class NotificationServiceTest {

    @Mock
    private NotificationRepository notificationRepository;

    @InjectMocks
    private NotificationService notificationService;

    private Notification mockNotification;
    private User mockUser;
    private UUID userId;
    private UUID notificationId;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        notificationId = UUID.randomUUID();

        mockUser = new User();
        mockUser.setId(userId);

        mockNotification = new Notification();
        mockNotification.setId(notificationId);
        mockNotification.setUser(mockUser);
        mockNotification.setTitle("Test Notification");
        mockNotification.setMessage("Test Message");
        mockNotification.setType("COURSE_UPDATED");
        mockNotification.setRead(false);
    }

    @Test
    void subscribe_Success_ReturnsSseEmitter() {
        // Act
        SseEmitter emitter = notificationService.subscribe(userId);

        // Assert
        assertNotNull(emitter);
    }

    @Test
    void getUserNotifications_Success_ReturnsList() {
        // Arrange
        when(notificationRepository.findByUserIdOrderByCreatedAtDesc(userId)).thenReturn(List.of(mockNotification));

        // Act
        List<NotificationDto> result = notificationService.getUserNotifications(userId);

        // Assert
        assertEquals(1, result.size());
        assertEquals("Test Notification", result.get(0).getTitle());
        verify(notificationRepository).findByUserIdOrderByCreatedAtDesc(userId);
    }

    @Test
    void markAsRead_Success_UpdatesNotification() {
        // Arrange
        when(notificationRepository.findById(notificationId)).thenReturn(Optional.of(mockNotification));
        when(notificationRepository.save(any(Notification.class))).thenAnswer(i -> i.getArgument(0));

        // Act
        notificationService.markAsRead(notificationId, userId);

        // Assert
        assertTrue(mockNotification.isRead());
        verify(notificationRepository).findById(notificationId);
        verify(notificationRepository).save(mockNotification);
    }

    @Test
    void markAsRead_NotFound_ThrowsException() {
        // Arrange
        when(notificationRepository.findById(notificationId)).thenReturn(Optional.empty());

        // Act & Assert
        EntityNotFoundException exception = assertThrows(EntityNotFoundException.class, () -> 
            notificationService.markAsRead(notificationId, userId)
        );
        assertEquals("Notification not found", exception.getMessage());
        verify(notificationRepository, never()).save(any());
    }

    @Test
    void createAndSendNotification_Success_SavesNotification() {
        // Arrange
        when(notificationRepository.save(any(Notification.class))).thenReturn(mockNotification);

        // Act
        notificationService.createAndSendNotification(mockNotification);

        // Assert
        verify(notificationRepository).save(mockNotification);
    }
}
