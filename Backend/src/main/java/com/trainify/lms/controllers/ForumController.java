package com.trainify.lms.controllers;

import com.trainify.lms.dto.ForumPostDto;
import com.trainify.lms.dto.ForumThreadDto;
import com.trainify.lms.security.CustomUserDetails;
import com.trainify.lms.services.ForumService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class ForumController {

    private final ForumService forumService;

    @GetMapping("/courses/{courseId}/forums/threads")
    @PreAuthorize("isAuthenticated()") // Regra pode verificar inscrição no curso futuramente
    public ResponseEntity<Page<ForumThreadDto>> getThreads(
            @PathVariable UUID courseId,
            Pageable pageable) {
        return ResponseEntity.ok(forumService.getThreadsByCourse(courseId, pageable));
    }

    @PostMapping("/courses/{courseId}/forums/threads")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ForumThreadDto> createThread(
            @PathVariable UUID courseId,
            @Valid @RequestBody CreateThreadRequest request,
            @AuthenticationPrincipal CustomUserDetails user) {
        
        return ResponseEntity.ok(forumService.createThread(
                courseId, 
                user.getId(), 
                request.getTitle(), 
                request.getContent()
        ));
    }

    @GetMapping("/forums/threads/{threadId}/posts")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<ForumPostDto>> getPosts(@PathVariable UUID threadId) {
        return ResponseEntity.ok(forumService.getPostsByThread(threadId));
    }

    @PostMapping("/forums/threads/{threadId}/posts")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ForumPostDto> createPost(
            @PathVariable UUID threadId,
            @Valid @RequestBody CreatePostRequest request,
            @AuthenticationPrincipal CustomUserDetails user) {
        
        return ResponseEntity.ok(forumService.addPostToThread(
                threadId,
                user.getId(),
                request.getContent()
        ));
    }

    @Data
    public static class CreateThreadRequest {
        @NotBlank
        private String title;
        @NotBlank
        private String content;
    }

    @Data
    public static class CreatePostRequest {
        @NotBlank
        private String content;
    }
}
