package com.trainify.lms.dto;

import lombok.Data;
import java.time.Instant;
import java.util.UUID;

@Data
public class ForumPostDto {
    private UUID id;
    private String content;
    private UUID authorId;
    private String authorName;
    private Instant createdAt;
}
