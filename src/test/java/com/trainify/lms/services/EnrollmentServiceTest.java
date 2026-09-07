package com.trainify.lms.services;

import com.trainify.lms.domain.entities.Course;
import com.trainify.lms.domain.entities.Enrollment;
import com.trainify.lms.domain.entities.Tenant;
import com.trainify.lms.domain.entities.User;
import com.trainify.lms.domain.enums.EnrollmentStatus;
import com.trainify.lms.dto.EnrollmentDto;
import com.trainify.lms.repositories.CourseRepository;
import com.trainify.lms.repositories.EnrollmentRepository;
import com.trainify.lms.repositories.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class EnrollmentServiceTest {

    @Mock
    private EnrollmentRepository enrollmentRepository;

    @Mock
    private CourseRepository courseRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private EnrollmentService enrollmentService;

    private Course mockCourse;
    private User mockUser;
    private Tenant mockTenant;
    private UUID courseId;
    private UUID userId;

    @BeforeEach
    void setUp() {
        courseId = UUID.randomUUID();
        userId = UUID.randomUUID();

        mockTenant = new Tenant();
        mockTenant.setId(UUID.randomUUID());

        mockCourse = new Course();
        mockCourse.setId(courseId);
        mockCourse.setTitle("Java Basics");

        mockUser = new User();
        mockUser.setId(userId);
        mockUser.setName("Student Name");
    }

    @Test
    void enrollUser_Success_ReturnsEnrollmentDto() {
        // Arrange
        when(courseRepository.findById(courseId)).thenReturn(Optional.of(mockCourse));
        when(userRepository.findById(userId)).thenReturn(Optional.of(mockUser));
        when(enrollmentRepository.existsByCourseIdAndUserId(courseId, userId)).thenReturn(false);

        Enrollment savedEnrollment = new Enrollment();
        savedEnrollment.setId(UUID.randomUUID());
        savedEnrollment.setCourse(mockCourse);
        savedEnrollment.setUser(mockUser);
        savedEnrollment.setStatus(EnrollmentStatus.IN_PROGRESS);

        when(enrollmentRepository.save(any(Enrollment.class))).thenReturn(savedEnrollment);

        // Act
        EnrollmentDto result = enrollmentService.enrollUser(courseId, userId, mockTenant);

        // Assert
        assertNotNull(result);
        assertEquals(EnrollmentStatus.IN_PROGRESS, result.getStatus());
        assertEquals("Java Basics", result.getCourse().getTitle());
        assertEquals("Student Name", result.getUser().getName());

        verify(courseRepository).findById(courseId);
        verify(userRepository).findById(userId);
        verify(enrollmentRepository).existsByCourseIdAndUserId(courseId, userId);
        verify(enrollmentRepository).save(any(Enrollment.class));
    }

    @Test
    void enrollUser_AlreadyEnrolled_ThrowsIllegalStateException() {
        // Arrange
        when(courseRepository.findById(courseId)).thenReturn(Optional.of(mockCourse));
        when(userRepository.findById(userId)).thenReturn(Optional.of(mockUser));
        when(enrollmentRepository.existsByCourseIdAndUserId(courseId, userId)).thenReturn(true);

        // Act & Assert
        IllegalStateException exception = assertThrows(IllegalStateException.class, () -> 
            enrollmentService.enrollUser(courseId, userId, mockTenant)
        );
        
        assertEquals("User is already enrolled in this course", exception.getMessage());
        verify(enrollmentRepository, never()).save(any(Enrollment.class));
    }

    @Test
    void enrollUser_CourseNotFound_ThrowsEntityNotFoundException() {
        // Arrange
        when(courseRepository.findById(courseId)).thenReturn(Optional.empty());

        // Act & Assert
        EntityNotFoundException exception = assertThrows(EntityNotFoundException.class, () -> 
            enrollmentService.enrollUser(courseId, userId, mockTenant)
        );
        
        assertEquals("Course not found", exception.getMessage());
        verify(userRepository, never()).findById(any());
        verify(enrollmentRepository, never()).save(any(Enrollment.class));
    }

    @Test
    void enrollUser_DataIntegrityViolation_ThrowsIllegalStateException() {
        // Arrange
        when(courseRepository.findById(courseId)).thenReturn(Optional.of(mockCourse));
        when(userRepository.findById(userId)).thenReturn(Optional.of(mockUser));
        when(enrollmentRepository.existsByCourseIdAndUserId(courseId, userId)).thenReturn(false);
        when(enrollmentRepository.save(any(Enrollment.class))).thenThrow(new DataIntegrityViolationException("Duplicate"));

        // Act & Assert
        IllegalStateException exception = assertThrows(IllegalStateException.class, () -> 
            enrollmentService.enrollUser(courseId, userId, mockTenant)
        );
        
        assertEquals("User is already enrolled in this course", exception.getMessage());
    }
}
