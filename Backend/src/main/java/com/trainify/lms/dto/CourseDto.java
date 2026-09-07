package com.trainify.lms.dto;

import com.trainify.lms.domain.enums.CourseStatus;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
public class CourseDto {
    private UUID id;
    private String title;
    private String description;
    private CourseStatus status;
    private UserDto instructor;
    private List<ModuleDto> modules;
}
