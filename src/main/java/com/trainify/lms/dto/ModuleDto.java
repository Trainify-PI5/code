package com.trainify.lms.dto;

import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
public class ModuleDto {
    private UUID id;
    private String title;
    private Integer orderIndex;
    private List<LessonDto> lessons;
}
