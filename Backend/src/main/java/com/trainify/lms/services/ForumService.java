package com.trainify.lms.services;

import com.trainify.lms.domain.entities.*;
import com.trainify.lms.dto.ForumPostDto;
import com.trainify.lms.dto.ForumThreadDto;
import com.trainify.lms.repositories.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import jakarta.persistence.EntityNotFoundException;

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
    private final com.trainify.lms.repositories.EnrollmentRepository enrollmentRepository;

    /**
     * Fórum é do curso: participa quem está matriculado, e quem ensina, gerencia
     * ou administra a empresa. Antes qualquer pessoa logada entrava em qualquer
     * fórum da plataforma.
     */
    private void garantirAcessoAoCurso(UUID courseId, UUID userId) {
        var autenticacao = org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication();

        if (autenticacao != null
                && autenticacao.getPrincipal() instanceof com.trainify.lms.security.CustomUserDetails usuario) {

            Course course = courseRepository.findById(courseId)
                    .orElseThrow(() -> new EntityNotFoundException("Curso não encontrado"));

            if (course.getTenant() != null && !course.getTenant().getId().equals(usuario.getTenantId())) {
                throw new EntityNotFoundException("Curso não encontrado");
            }

            boolean acompanha = usuario.getAuthorities().stream()
                    .map(a -> a.getAuthority())
                    .anyMatch(papel -> papel.equals("ROLE_SUPER_ADMIN") || papel.equals("ROLE_ADMIN")
                            || papel.equals("ROLE_MANAGER") || papel.equals("ROLE_INSTRUCTOR"));

            if (!acompanha && enrollmentRepository.findByUserIdAndCourseId(userId, courseId).isEmpty()) {
                throw new org.springframework.security.access.AccessDeniedException(
                        "Matricule-se no curso para participar do fórum.");
            }
        }
    }

    public Page<ForumThreadDto> getThreadsByCourse(UUID courseId, Pageable pageable) {
        return threadRepository.findByCourseIdOrderByCreatedAtDesc(courseId, pageable)
                .map(this::mapThreadToDto);
    }

    public ForumThreadDto createThread(UUID courseId, UUID authorId, String title, String initialPostContent) {
        garantirAcessoAoCurso(courseId, authorId);
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
