package com.trainify.lms.services;

import com.trainify.lms.dto.KpiDto;
import com.trainify.lms.repositories.CourseRepository;
import com.trainify.lms.repositories.EnrollmentRepository;
import com.trainify.lms.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final UserRepository userRepository;
    private final CourseRepository courseRepository;
    private final EnrollmentRepository enrollmentRepository;

    @Transactional(readOnly = true)
    public KpiDto getTenantKpis() {
        // As repositórios já estão filtrados pelo TenantAspect usando RLS
        long totalUsers = userRepository.count();
        long totalCourses = courseRepository.count();
        long totalEnrollments = enrollmentRepository.count();
        
        // Exemplo simplificado. Na vida real teríamos métodos específicos countByStatus
        long completed = enrollmentRepository.findAll().stream()
            .filter(e -> com.trainify.lms.domain.enums.EnrollmentStatus.COMPLETED.equals(e.getStatus()))
            .count();
            
        long active = totalEnrollments - completed;

        return KpiDto.builder()
                .totalUsers(totalUsers)
                .totalCourses(totalCourses)
                .activeEnrollments(active)
                .completedEnrollments(completed)
                .build();
    }
}
