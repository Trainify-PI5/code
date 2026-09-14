package com.trainify.lms.services;

import com.trainify.lms.domain.entities.Course;
import com.trainify.lms.domain.entities.Enrollment;
import com.trainify.lms.domain.entities.Lesson;
import com.trainify.lms.domain.entities.LessonProgress;
import com.trainify.lms.domain.entities.Module;
import com.trainify.lms.domain.entities.User;
import com.trainify.lms.domain.entities.Tenant;
import com.trainify.lms.domain.enums.ProgressStatus;
import com.trainify.lms.dto.HeartbeatRequest;
import com.trainify.lms.dto.LessonProgressDto;
import com.trainify.lms.exceptions.LessonLockedException;
import com.trainify.lms.repositories.EnrollmentRepository;
import com.trainify.lms.repositories.LessonProgressRepository;
import com.trainify.lms.repositories.LessonRepository;
import com.trainify.lms.repositories.ModuleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.access.AccessDeniedException;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
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
    private ModuleRepository moduleRepository;

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
    private Course mockCourse;
    private Module mockModule;

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

        mockCourse = new Course();
        mockCourse.setId(UUID.randomUUID());
        mockEnrollment.setCourse(mockCourse);

        mockModule = new Module();
        mockModule.setId(UUID.randomUUID());
        mockModule.setCourse(mockCourse);
        mockLesson.setModule(mockModule);
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
        when(moduleRepository.findByCourseIdOrderByOrderIndexAsc(mockCourse.getId())).thenReturn(List.of(mockModule));
        when(lessonRepository.findByModuleIdOrderByOrderIndexAsc(mockModule.getId())).thenReturn(List.of(mockLesson));

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

    @Test
    void getCourseProgress_ComputesStatusAndLockInCourseOrder() {
        // Arrange: modulo 1 com l1 concluida e l2 em andamento; modulo 2 com l3 sem progresso e l4 concluida
        Module module2 = module();
        Lesson l1 = lesson(mockModule);
        Lesson l2 = lesson(mockModule);
        Lesson l3 = lesson(module2);
        Lesson l4 = lesson(module2);

        when(enrollmentRepository.findById(enrollmentId)).thenReturn(Optional.of(mockEnrollment));
        when(lessonProgressRepository.findByEnrollmentId(enrollmentId)).thenReturn(List.of(
                progress(l1, ProgressStatus.COMPLETED, 120),
                progress(l2, ProgressStatus.IN_PROGRESS, 30),
                progress(l4, ProgressStatus.COMPLETED, 60)));
        when(moduleRepository.findByCourseIdOrderByOrderIndexAsc(mockCourse.getId())).thenReturn(List.of(mockModule, module2));
        when(lessonRepository.findByModuleIdOrderByOrderIndexAsc(mockModule.getId())).thenReturn(List.of(l1, l2));
        when(lessonRepository.findByModuleIdOrderByOrderIndexAsc(module2.getId())).thenReturn(List.of(l3, l4));

        // Act
        List<LessonProgressDto> result = progressService.getCourseProgress(enrollmentId, userId);

        // Assert
        assertEquals(List.of(l1.getId(), l2.getId(), l3.getId(), l4.getId()),
                result.stream().map(LessonProgressDto::getLessonId).toList());

        assertEquals(ProgressStatus.COMPLETED, result.get(0).getStatus());
        assertEquals(120, result.get(0).getWatchedSeconds());
        assertFalse(result.get(0).isLocked());

        // Anterior concluida: liberada
        assertEquals(ProgressStatus.IN_PROGRESS, result.get(1).getStatus());
        assertFalse(result.get(1).isLocked());

        // Anterior apenas em andamento e sem progresso proprio: bloqueada
        assertEquals(ProgressStatus.NOT_STARTED, result.get(2).getStatus());
        assertEquals(0, result.get(2).getWatchedSeconds());
        assertTrue(result.get(2).isLocked());

        // Ja tem progresso: nunca volta a bloquear, mesmo com a anterior pendente
        assertFalse(result.get(3).isLocked());
    }

    @Test
    void getCourseProgress_EnrollmentOfAnotherUser_ThrowsAccessDenied() {
        // Arrange
        when(enrollmentRepository.findById(enrollmentId)).thenReturn(Optional.of(mockEnrollment));

        // Act & Assert
        assertThrows(AccessDeniedException.class, () -> progressService.getCourseProgress(enrollmentId, UUID.randomUUID()));
        verifyNoInteractions(lessonProgressRepository, moduleRepository);
    }

    @Test
    void recordHeartbeat_LockedLesson_RejectsWithoutSaving() {
        // Arrange: aula anterior sem progresso
        Lesson previous = lesson(mockModule);
        HeartbeatRequest request = heartbeat(15, false);

        when(enrollmentRepository.findById(enrollmentId)).thenReturn(Optional.of(mockEnrollment));
        when(lessonRepository.findById(lessonId)).thenReturn(Optional.of(mockLesson));
        when(moduleRepository.findByCourseIdOrderByOrderIndexAsc(mockCourse.getId())).thenReturn(List.of(mockModule));
        when(lessonRepository.findByModuleIdOrderByOrderIndexAsc(mockModule.getId())).thenReturn(List.of(previous, mockLesson));

        // Act & Assert
        assertThrows(LessonLockedException.class, () -> progressService.recordHeartbeat(enrollmentId, lessonId, request, userId));
        verify(lessonProgressRepository, never()).save(any());
        verify(eventPublisher, never()).publishEvent(any());
    }

    @Test
    void recordHeartbeat_PreviousLessonCompleted_SavesProgress() {
        // Arrange
        Lesson previous = lesson(mockModule);
        HeartbeatRequest request = heartbeat(15, false);

        when(enrollmentRepository.findById(enrollmentId)).thenReturn(Optional.of(mockEnrollment));
        when(lessonRepository.findById(lessonId)).thenReturn(Optional.of(mockLesson));
        when(moduleRepository.findByCourseIdOrderByOrderIndexAsc(mockCourse.getId())).thenReturn(List.of(mockModule));
        when(lessonRepository.findByModuleIdOrderByOrderIndexAsc(mockModule.getId())).thenReturn(List.of(previous, mockLesson));
        when(lessonProgressRepository.findByEnrollmentIdAndLessonId(enrollmentId, lessonId)).thenReturn(Optional.empty());
        when(lessonProgressRepository.findByEnrollmentIdAndLessonId(enrollmentId, previous.getId()))
                .thenReturn(Optional.of(progress(previous, ProgressStatus.COMPLETED, 300)));

        // Act
        progressService.recordHeartbeat(enrollmentId, lessonId, request, userId);

        // Assert
        verify(lessonProgressRepository).save(argThat(p -> p.getStatus() == ProgressStatus.IN_PROGRESS && p.getWatchedSeconds() == 15));
        verify(eventPublisher).publishEvent(any(EnrollmentProgressEvent.class));
    }

    @Test
    void recordHeartbeat_LessonFromAnotherCourse_RejectsWithoutSaving() {
        // Arrange
        Course otherCourse = new Course();
        otherCourse.setId(UUID.randomUUID());
        Module otherModule = new Module();
        otherModule.setCourse(otherCourse);
        mockLesson.setModule(otherModule);

        when(enrollmentRepository.findById(enrollmentId)).thenReturn(Optional.of(mockEnrollment));
        when(lessonRepository.findById(lessonId)).thenReturn(Optional.of(mockLesson));

        // Act & Assert
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> progressService.recordHeartbeat(enrollmentId, lessonId, heartbeat(10, true), userId));
        assertEquals("Lesson does not belong to the enrollment course", exception.getMessage());
        verify(lessonProgressRepository, never()).save(any());
    }

    @Test
    void recordHeartbeat_LessonWithProgress_SkipsCourseOrderQueries() {
        // Arrange
        when(enrollmentRepository.findById(enrollmentId)).thenReturn(Optional.of(mockEnrollment));
        when(lessonRepository.findById(lessonId)).thenReturn(Optional.of(mockLesson));
        when(lessonProgressRepository.findByEnrollmentIdAndLessonId(enrollmentId, lessonId))
                .thenReturn(Optional.of(progress(mockLesson, ProgressStatus.IN_PROGRESS, 40)));

        // Act
        progressService.recordHeartbeat(enrollmentId, lessonId, heartbeat(50, false), userId);

        // Assert
        verifyNoInteractions(moduleRepository);
        verify(lessonProgressRepository).save(any());
    }

    @Test
    void completeLesson_UnlockedLesson_MarksCompletedAndFiresEvent() {
        // Arrange: primeira aula do curso, sem progresso
        when(moduleRepository.findByCourseIdOrderByOrderIndexAsc(mockCourse.getId())).thenReturn(List.of(mockModule));
        when(lessonRepository.findByModuleIdOrderByOrderIndexAsc(mockModule.getId())).thenReturn(List.of(mockLesson));

        // Act
        progressService.completeLesson(mockEnrollment, mockLesson);

        // Assert
        verify(lessonProgressRepository).save(argThat(p ->
                p.getStatus() == ProgressStatus.COMPLETED && p.getLesson().equals(mockLesson) && p.getEnrollment().equals(mockEnrollment)));
        verify(eventPublisher).publishEvent(any(EnrollmentProgressEvent.class));
    }

    @Test
    void completeLesson_AlreadyCompleted_DoesNothing() {
        // Arrange
        when(lessonProgressRepository.findByEnrollmentIdAndLessonId(enrollmentId, lessonId))
                .thenReturn(Optional.of(progress(mockLesson, ProgressStatus.COMPLETED, 0)));

        // Act
        progressService.completeLesson(mockEnrollment, mockLesson);

        // Assert
        verify(lessonProgressRepository, never()).save(any());
        verify(eventPublisher, never()).publishEvent(any());
    }

    @Test
    void completeLesson_LockedLesson_Throws() {
        // Arrange
        Lesson previous = lesson(mockModule);
        when(moduleRepository.findByCourseIdOrderByOrderIndexAsc(mockCourse.getId())).thenReturn(List.of(mockModule));
        when(lessonRepository.findByModuleIdOrderByOrderIndexAsc(mockModule.getId())).thenReturn(List.of(previous, mockLesson));

        // Act & Assert
        assertThrows(LessonLockedException.class, () -> progressService.completeLesson(mockEnrollment, mockLesson));
        verify(lessonProgressRepository, never()).save(any());
    }

    @Test
    void isLocked_OnlyWhenPreviousIncompleteAndLessonNotStarted() {
        assertFalse(ProgressService.isLocked(true, ProgressStatus.NOT_STARTED));
        assertTrue(ProgressService.isLocked(false, ProgressStatus.NOT_STARTED));
        assertFalse(ProgressService.isLocked(false, ProgressStatus.IN_PROGRESS));
        assertFalse(ProgressService.isLocked(false, ProgressStatus.COMPLETED));
    }

    private Module module() {
        Module module = new Module();
        module.setId(UUID.randomUUID());
        module.setCourse(mockCourse);
        return module;
    }

    private Lesson lesson(Module module) {
        Lesson lesson = new Lesson();
        lesson.setId(UUID.randomUUID());
        lesson.setModule(module);
        return lesson;
    }

    private LessonProgress progress(Lesson lesson, ProgressStatus status, int watchedSeconds) {
        LessonProgress progress = new LessonProgress();
        progress.setLesson(lesson);
        progress.setEnrollment(mockEnrollment);
        progress.setStatus(status);
        progress.setWatchedSeconds(watchedSeconds);
        return progress;
    }

    private HeartbeatRequest heartbeat(int watchedSeconds, boolean completed) {
        HeartbeatRequest request = new HeartbeatRequest();
        request.setWatchedSeconds(watchedSeconds);
        request.setIsCompleted(completed);
        return request;
    }
}
