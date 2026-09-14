package com.trainify.lms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CourseCompletionDto {
    private UUID courseId;
    private String title;
    private long enrollments;
    private long completed;
    private int completionRate;
}
