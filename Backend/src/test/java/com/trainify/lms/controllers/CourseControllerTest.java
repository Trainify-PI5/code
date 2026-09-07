package com.trainify.lms.controllers;

import com.trainify.lms.domain.entities.Tenant;
import com.trainify.lms.dto.CourseDto;
import com.trainify.lms.dto.CreateCourseRequest;
import com.trainify.lms.dto.EnrollmentDto;
import com.trainify.lms.security.CustomUserDetails;
import com.trainify.lms.services.CourseService;
import com.trainify.lms.services.EnrollmentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class CourseControllerTest {

    @Mock
    private CourseService courseService;

    @Mock
    private EnrollmentService enrollmentService;

    @InjectMocks
    private CourseController courseController;

    private CustomUserDetails mockUserDetails;
    private UUID tenantId;
    private UUID userId;

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        userId = UUID.randomUUID();
        
        mockUserDetails = mock(CustomUserDetails.class);
        when(mockUserDetails.getTenantId()).thenReturn(tenantId);
    }

    @Test
    void getPublishedCourses_Success_ReturnsOkResponse() {
        // Arrange
        CourseDto course = new CourseDto();
        course.setTitle("Published Course");
        when(courseService.getPublishedCourses(tenantId)).thenReturn(List.of(course));

        // Act
        ResponseEntity<List<CourseDto>> response = courseController.getPublishedCourses(mockUserDetails);

        // Assert
        assertNotNull(response);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(1, response.getBody().size());
        verify(courseService).getPublishedCourses(tenantId);
    }

    @Test
    void createCourse_Success_ReturnsCreatedResponse() {
        // Arrange
        when(mockUserDetails.getId()).thenReturn(userId);
        
        CreateCourseRequest request = new CreateCourseRequest();
        request.setTitle("New Course");
        
        CourseDto createdCourse = new CourseDto();
        createdCourse.setTitle("New Course");
        
        when(courseService.createCourse(eq(request), eq(userId), any(Tenant.class))).thenReturn(createdCourse);

        // Act
        ResponseEntity<CourseDto> response = courseController.createCourse(request, mockUserDetails);

        // Assert
        assertNotNull(response);
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertEquals("New Course", response.getBody().getTitle());
        verify(courseService).createCourse(eq(request), eq(userId), any(Tenant.class));
    }

    @Test
    void enrollUser_Success_ReturnsCreatedResponse() {
        // Arrange
        when(mockUserDetails.getId()).thenReturn(userId);
        UUID courseId = UUID.randomUUID();
        
        EnrollmentDto enrollmentDto = new EnrollmentDto();
        
        when(enrollmentService.enrollUser(eq(courseId), eq(userId), any(Tenant.class))).thenReturn(enrollmentDto);

        // Act
        ResponseEntity<EnrollmentDto> response = courseController.enrollUser(courseId, mockUserDetails);

        // Assert
        assertNotNull(response);
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        verify(enrollmentService).enrollUser(eq(courseId), eq(userId), any(Tenant.class));
    }
}
