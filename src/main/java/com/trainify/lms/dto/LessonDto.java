package com.trainify.lms.dto;

import lombok.Data;

import java.util.UUID;

@Data
public class LessonDto {
    private UUID id;
    private String title;
    private String content;
    private Integer orderIndex;
}
