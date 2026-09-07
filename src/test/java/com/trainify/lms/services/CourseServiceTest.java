package com.trainify.lms.services;

import com.trainify.lms.domain.entities.Course;
import com.trainify.lms.domain.entities.Lesson;
import com.trainify.lms.domain.entities.Module;
import com.trainify.lms.domain.entities.Tenant;
import com.trainify.lms.domain.entities.User;
import com.trainify.lms.domain.enums.CourseStatus;
import com.trainify.lms.dto.CourseDto;
import com.trainify.lms.dto.CreateCourseRequest;
import com.trainify.lms.repositories.CourseRepository;
import com.trainify.lms.repositories.LessonRepository;
import com.trainify.lms.repositories.ModuleRepository;
import com.trainify.lms.repositories.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class CourseServiceTest {

    @Mock
    private CourseRepository courseRepository;

    @Mock
    private ModuleRepository moduleRepository;

    @Mock
    private LessonRepository lessonRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private CourseService courseService;

    private Course mockCourse;
    private User mockInstructor;
    private Tenant mockTenant;
    private UUID courseId;
    private UUID instructorId;

    @BeforeEach
    void setUp() {
        courseId = UUID.randomUUID();
        instructorId = UUID.randomUUID();

        mockTenant = new Tenant();
        mockTenant.setId(UUID.randomUUID());

        mockInstructor = new User();
        mockInstructor.setId(instructorId);
        mockInstructor.setName("Instructor");

        mockCourse = new Course();
        mockCourse.setId(courseId);
        mockCourse.setTitle("Test Course");
        mockCourse.setDescription("Description");
        mockCourse.setStatus(CourseStatus.DRAFT);
        mockCourse.setInstructor(mockInstructor);
        mockCourse.setTenant(mockTenant);
    }

    @Test
    void getCourseById_Success_ReturnsCourseDto() {
        // Arrange
        when(courseRepository.findById(courseId)).thenReturn(Optional.of(mockCourse));
        when(moduleRepository.findByCourseIdOrderByOrderIndexAsc(courseId)).thenReturn(Collections.emptyList());

        // Act
        CourseDto result = courseService.getCourseById(courseId);

        // Assert
        assertNotNull(result);
        assertEquals("Test Course", result.getTitle());
        assertEquals("Instructor", result.getInstructor().getName());
        verify(courseRepository).findById(courseId);
    }

    @Test
    void getCourseById_NotFound_ThrowsException() {
        // Arrange
        when(courseRepository.findById(courseId)).thenReturn(Optional.empty());

        // Act & Assert
        EntityNotFoundException exception = assertThrows(EntityNotFoundException.class,
                () -> courseService.getCourseById(courseId));
        assertEquals("Course not found", exception.getMessage());
    }

    @Test
    void createCourse_Success_ReturnsCourseDto() {
        // Arrange
        CreateCourseRequest request = new CreateCourseRequest();
        request.setTitle("New Course");
        request.setDescription("New Desc");
        when(userRepository.findById(instructorId)).thenReturn(Optional.of(mockInstructor));
        when(courseRepository.save(any(Course.class))).thenAnswer(i -> i.getArgument(0));

        // Act
        CourseDto result = courseService.createCourse(request, instructorId, mockTenant);

        // Assert
        assertNotNull(result);
        assertEquals("New Course", result.getTitle());
        assertEquals(CourseStatus.DRAFT, result.getStatus());
        verify(userRepository).findById(instructorId);
        verify(courseRepository).save(any(Course.class));
    }

    @Test
    void publishCourse_Success_ChangesStatusToPublished() {
        // Arrange
        Module mockModule = new Module();
        mockModule.setId(UUID.randomUUID());
        mockModule.setTitle("Module 1");

        Lesson mockLesson = new Lesson();
        mockLesson.setId(UUID.randomUUID());

        when(courseRepository.findById(courseId)).thenReturn(Optional.of(mockCourse));
        when(moduleRepository.findByCourseIdOrderByOrderIndexAsc(courseId)).thenReturn(List.of(mockModule));
        when(lessonRepository.findByModuleIdOrderByOrderIndexAsc(mockModule.getId())).thenReturn(List.of(mockLesson));
        when(courseRepository.save(any(Course.class))).thenAnswer(i -> i.getArgument(0));

        // Act
        CourseDto result = courseService.publishCourse(courseId);

        // Assert
        assertEquals(CourseStatus.PUBLISHED, result.getStatus());
        verify(courseRepository).save(mockCourse);
    }

    @Test
    void publishCourse_NoModules_ThrowsException() {
        // Arrange
        when(courseRepository.findById(courseId)).thenReturn(Optional.of(mockCourse));
        when(moduleRepository.findByCourseIdOrderByOrderIndexAsc(courseId)).thenReturn(Collections.emptyList());

        // Act & Assert
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> courseService.publishCourse(courseId));
        assertEquals("Cannot publish course without modules", exception.getMessage());
        verify(courseRepository, never()).save(any(Course.class));
    }

    @Test
    void publishCourse_ModuleHasNoLessons_ThrowsException() {
        // Arrange
        Module mockModule = new Module();
        mockModule.setId(UUID.randomUUID());
        mockModule.setTitle("Empty Module");

        when(courseRepository.findById(courseId)).thenReturn(Optional.of(mockCourse));
        when(moduleRepository.findByCourseIdOrderByOrderIndexAsc(courseId)).thenReturn(List.of(mockModule));
        when(lessonRepository.findByModuleIdOrderByOrderIndexAsc(mockModule.getId()))
                .thenReturn(Collections.emptyList());

        // Act & Assert
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> courseService.publishCourse(courseId));
        assertEquals("Cannot publish course: module 'Empty Module' has no lessons", exception.getMessage());
        verify(courseRepository, never()).save(any(Course.class));
    }
}
