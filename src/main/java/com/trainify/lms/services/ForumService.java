package com.trainify.lms.services;

import com.trainify.lms.domain.entities.*;
import com.trainify.lms.dto.ForumPostDto;
import com.trainify.lms.dto.ForumThreadDto;
import com.trainify.lms.repositories.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ForumService {

    private final ForumThreadRepository threadRepository;
    private final ForumPostRepository postRepository;
    private final CourseRepository courseRepository;
    private final UserRepository userRepository;

    public Page<ForumThreadDto> getThreadsByCourse(UUID courseId, Pageable pageable) {
        return threadRepository.findByCourseIdOrderByCreatedAtDesc(courseId, pageable)
                .map(this::mapThreadToDto);
    }

    public ForumThreadDto createThread(UUID courseId, UUID authorId, String title, String initialPostContent) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new IllegalArgumentException("Course not found"));
        User author = userRepository.findById(authorId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        ForumThread thread = new ForumThread();
        thread.setTenant(course.getTenant());
        thread.setCourse(course);
        thread.setAuthor(author);
        thread.setTitle(title);
        
        thread = threadRepository.save(thread);

        ForumPost post = new ForumPost();
        post.setTenant(course.getTenant());
        post.setThread(thread);
        post.setAuthor(author);
        post.setContent(initialPostContent);
        
        postRepository.save(post);

        return mapThreadToDto(thread);
    }

    public List<ForumPostDto> getPostsByThread(UUID threadId) {
        return postRepository.findByThreadIdOrderByCreatedAtAsc(threadId).stream()
                .map(this::mapPostToDto)
                .collect(Collectors.toList());
    }

    public ForumPostDto addPostToThread(UUID threadId, UUID authorId, String content) {
        ForumThread thread = threadRepository.findById(threadId)
                .orElseThrow(() -> new IllegalArgumentException("Thread not found"));
        User author = userRepository.findById(authorId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        ForumPost post = new ForumPost();
        post.setTenant(thread.getTenant());
        post.setThread(thread);
        post.setAuthor(author);
        post.setContent(content);

        post = postRepository.save(post);

        return mapPostToDto(post);
    }

    private ForumThreadDto mapThreadToDto(ForumThread thread) {
        ForumThreadDto dto = new ForumThreadDto();
        dto.setId(thread.getId());
        dto.setTitle(thread.getTitle());
        dto.setAuthorId(thread.getAuthor().getId());
        dto.setAuthorName(thread.getAuthor().getName());
        dto.setCreatedAt(thread.getCreatedAt());
        return dto;
    }

    private ForumPostDto mapPostToDto(ForumPost post) {
        ForumPostDto dto = new ForumPostDto();
        dto.setId(post.getId());
        dto.setContent(post.getContent());
        dto.setAuthorId(post.getAuthor().getId());
        dto.setAuthorName(post.getAuthor().getName());
        dto.setCreatedAt(post.getCreatedAt());
        return dto;
    }
}
