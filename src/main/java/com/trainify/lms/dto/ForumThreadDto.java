package com.trainify.lms.dto;

import lombok.Data;
import java.time.Instant;
import java.util.UUID;

@Data
public class ForumThreadDto {
    private UUID id;
    private String title;
    private UUID authorId;
    private String authorName;
    private Instant createdAt;
}
