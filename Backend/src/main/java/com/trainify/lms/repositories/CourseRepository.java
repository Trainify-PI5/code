package com.trainify.lms.repositories;

import com.trainify.lms.domain.entities.Course;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface CourseRepository extends JpaRepository<Course, UUID> {
    Page<Course> findAllByStatus(com.trainify.lms.domain.enums.CourseStatus status, Pageable pageable);

    // Usadas pelo dashboard: o isolamento por empresa e feito na aplicacao
    long countByTenantId(UUID tenantId);
    java.util.List<Course> findByTenantId(UUID tenantId);

    // Usadas pela tela inicial de cada perfil
    long countByTenantIdAndStatus(UUID tenantId, com.trainify.lms.domain.enums.CourseStatus status);
    long countByInstructorIdAndStatus(UUID instructorId, com.trainify.lms.domain.enums.CourseStatus status);
}
