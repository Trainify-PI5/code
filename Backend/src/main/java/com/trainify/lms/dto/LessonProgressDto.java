package com.trainify.lms.dto;

import com.trainify.lms.domain.enums.ProgressStatus;
import lombok.Data;

import java.util.UUID;

@Data
public class LessonProgressDto {
    private UUID lessonId;
    private ProgressStatus status;
    private Integer watchedSeconds;
    private boolean locked;
}
