package com.trainify.lms.services;

import com.trainify.lms.domain.entities.Enrollment;
import com.trainify.lms.domain.entities.Lesson;
import com.trainify.lms.domain.entities.LessonProgress;
import com.trainify.lms.domain.entities.User;
import com.trainify.lms.domain.entities.Tenant;
import com.trainify.lms.domain.enums.ProgressStatus;
import com.trainify.lms.dto.HeartbeatRequest;
import com.trainify.lms.repositories.EnrollmentRepository;
import com.trainify.lms.repositories.LessonProgressRepository;
import com.trainify.lms.repositories.LessonRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class ProgressServiceTest {

    @Mock
    private LessonProgressRepository lessonProgressRepository;

    @Mock
    private EnrollmentRepository enrollmentRepository;

    @Mock
    private LessonRepository lessonRepository;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private ProgressService progressService;

    private UUID enrollmentId;
    private UUID lessonId;
    private Enrollment mockEnrollment;
    private Lesson mockLesson;
    private Tenant mockTenant;
    private UUID userId;
    private User mockUser;

    @BeforeEach
    void setUp() {
        enrollmentId = UUID.randomUUID();
        lessonId = UUID.randomUUID();

        mockTenant = new Tenant();
        mockTenant.setId(UUID.randomUUID());

        userId = UUID.randomUUID();
        mockUser = new User();
        mockUser.setId(userId);

        mockEnrollment = new Enrollment();
        mockEnrollment.setId(enrollmentId);
        mockEnrollment.setTenant(mockTenant);
        mockEnrollment.setUser(mockUser);

        mockLesson = new Lesson();
        mockLesson.setId(lessonId);
    }

    @Test
    void recordHeartbeat_ExistingProgress_UpdatesAndFiresEvent() {
        // Arrange
        HeartbeatRequest request = new HeartbeatRequest();
        request.setWatchedSeconds(120);
        request.setIsCompleted(true);

        LessonProgress existingProgress = new LessonProgress();
        existingProgress.setStatus(ProgressStatus.IN_PROGRESS);

        when(enrollmentRepository.findById(enrollmentId)).thenReturn(Optional.of(mockEnrollment));
        when(lessonRepository.findById(lessonId)).thenReturn(Optional.of(mockLesson));
        when(lessonProgressRepository.findByEnrollmentIdAndLessonId(enrollmentId, lessonId)).thenReturn(Optional.of(existingProgress));

        // Act
        progressService.recordHeartbeat(enrollmentId, lessonId, request, userId);

        // Assert
        assertEquals(ProgressStatus.COMPLETED, existingProgress.getStatus());
        assertEquals(120, existingProgress.getWatchedSeconds());

        verify(lessonProgressRepository).save(existingProgress);
        verify(eventPublisher).publishEvent(any(EnrollmentProgressEvent.class));
    }

    @Test
    void recordHeartbeat_NewProgress_CreatesAndStarts() {
        // Arrange
        HeartbeatRequest request = new HeartbeatRequest();
        request.setWatchedSeconds(10);
        request.setIsCompleted(false);

        when(enrollmentRepository.findById(enrollmentId)).thenReturn(Optional.of(mockEnrollment));
        when(lessonRepository.findById(lessonId)).thenReturn(Optional.of(mockLesson));
        when(lessonProgressRepository.findByEnrollmentIdAndLessonId(enrollmentId, lessonId)).thenReturn(Optional.empty());

        // Act
        progressService.recordHeartbeat(enrollmentId, lessonId, request, userId);

        // Assert
        verify(lessonProgressRepository).save(argThat(progress -> 
            progress.getStatus() == ProgressStatus.IN_PROGRESS &&
            progress.getWatchedSeconds() == 10 &&
            progress.getEnrollment().equals(mockEnrollment) &&
            progress.getLesson().equals(mockLesson)
        ));
        verify(eventPublisher).publishEvent(any(EnrollmentProgressEvent.class));
    }

    @Test
    void recordHeartbeat_EnrollmentNotFound_ThrowsException() {
        // Arrange
        HeartbeatRequest request = new HeartbeatRequest();
        when(enrollmentRepository.findById(enrollmentId)).thenReturn(Optional.empty());

        // Act & Assert
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> 
            progressService.recordHeartbeat(enrollmentId, lessonId, request, userId)
        );
        assertEquals("Enrollment not found", exception.getMessage());
        
        verify(lessonProgressRepository, never()).save(any());
        verify(eventPublisher, never()).publishEvent(any());
    }

    @Test
    void recordHeartbeat_LessonNotFound_ThrowsException() {
        // Arrange
        HeartbeatRequest request = new HeartbeatRequest();
        when(enrollmentRepository.findById(enrollmentId)).thenReturn(Optional.of(mockEnrollment));
        when(lessonRepository.findById(lessonId)).thenReturn(Optional.empty());

        // Act & Assert
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> 
            progressService.recordHeartbeat(enrollmentId, lessonId, request, userId)
        );
        assertEquals("Lesson not found", exception.getMessage());
        
        verify(lessonProgressRepository, never()).save(any());
        verify(eventPublisher, never()).publishEvent(any());
    }
}
