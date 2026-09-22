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

    // Media da melhor nota de cada aluno nas avaliacoes da empresa; -1 sem tentativas
    private int averageScore;
}
