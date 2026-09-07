package com.trainify.lms.services;

import com.trainify.lms.domain.entities.Course;
import com.trainify.lms.domain.entities.ForumPost;
import com.trainify.lms.domain.entities.ForumThread;
import com.trainify.lms.domain.entities.Tenant;
import com.trainify.lms.domain.entities.User;
import com.trainify.lms.dto.ForumPostDto;
import com.trainify.lms.dto.ForumThreadDto;
import com.trainify.lms.repositories.CourseRepository;
import com.trainify.lms.repositories.ForumPostRepository;
import com.trainify.lms.repositories.ForumThreadRepository;
import com.trainify.lms.repositories.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class ForumServiceTest {

    @Mock
    private ForumThreadRepository threadRepository;

    @Mock
    private ForumPostRepository postRepository;

    @Mock
    private CourseRepository courseRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private ForumService forumService;

    private UUID courseId;
    private UUID authorId;
    private UUID threadId;
    private Course mockCourse;
    private User mockAuthor;
    private ForumThread mockThread;

    @BeforeEach
    void setUp() {
        courseId = UUID.randomUUID();
        authorId = UUID.randomUUID();
        threadId = UUID.randomUUID();

        Tenant mockTenant = new Tenant();
        mockTenant.setId(UUID.randomUUID());

        mockCourse = new Course();
        mockCourse.setId(courseId);
        mockCourse.setTenant(mockTenant);

        mockAuthor = new User();
        mockAuthor.setId(authorId);
        mockAuthor.setName("Test Author");

        mockThread = new ForumThread();
        mockThread.setId(threadId);
        mockThread.setCourse(mockCourse);
        mockThread.setAuthor(mockAuthor);
        mockThread.setTitle("Test Thread");
    }

    @Test
    void getThreadsByCourse_Success_ReturnsPage() {
        // Arrange
        Pageable pageable = PageRequest.of(0, 10);
        Page<ForumThread> page = new PageImpl<>(List.of(mockThread));
        when(threadRepository.findByCourseIdOrderByCreatedAtDesc(courseId, pageable)).thenReturn(page);

        // Act
        Page<ForumThreadDto> result = forumService.getThreadsByCourse(courseId, pageable);

        // Assert
        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        assertEquals("Test Thread", result.getContent().get(0).getTitle());
        verify(threadRepository).findByCourseIdOrderByCreatedAtDesc(courseId, pageable);
    }

    @Test
    void createThread_Success_CreatesThreadAndInitialPost() {
        // Arrange
        when(courseRepository.findById(courseId)).thenReturn(Optional.of(mockCourse));
        when(userRepository.findById(authorId)).thenReturn(Optional.of(mockAuthor));
        when(threadRepository.save(any(ForumThread.class))).thenReturn(mockThread);
        
        ForumPost mockPost = new ForumPost();
        when(postRepository.save(any(ForumPost.class))).thenReturn(mockPost);

        // Act
        ForumThreadDto result = forumService.createThread(courseId, authorId, "New Thread", "First Post");

        // Assert
        assertNotNull(result);
        assertEquals("Test Thread", result.getTitle()); // Obtido do mockThread
        verify(courseRepository).findById(courseId);
        verify(userRepository).findById(authorId);
        verify(threadRepository).save(any(ForumThread.class));
        verify(postRepository).save(any(ForumPost.class));
    }

    @Test
    void addPostToThread_Success_CreatesAndReturnsPost() {
        // Arrange
        when(threadRepository.findById(threadId)).thenReturn(Optional.of(mockThread));
        when(userRepository.findById(authorId)).thenReturn(Optional.of(mockAuthor));

        when(postRepository.save(any(ForumPost.class))).thenAnswer(i -> {
            ForumPost p = i.getArgument(0);
            p.setId(UUID.randomUUID());
            return p;
        });

        // Act
        ForumPostDto result = forumService.addPostToThread(threadId, authorId, "A response");

        // Assert
        assertNotNull(result);
        assertEquals("A response", result.getContent());
        verify(threadRepository).findById(threadId);
        verify(postRepository).save(any(ForumPost.class));
    }

    @Test
    void addPostToThread_ThreadNotFound_ThrowsException() {
        // Arrange
        when(threadRepository.findById(threadId)).thenReturn(Optional.empty());

        // Act & Assert
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> 
            forumService.addPostToThread(threadId, authorId, "A response")
        );
        assertEquals("Thread not found", exception.getMessage());
    }
}
