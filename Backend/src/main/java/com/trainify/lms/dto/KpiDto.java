package com.trainify.lms.dto;

import lombok.Data;
import lombok.Builder;

@Data
@Builder
public class KpiDto {
    private long totalUsers;
    private long totalCourses;
    private long activeEnrollments;
    private long completedEnrollments;
}
