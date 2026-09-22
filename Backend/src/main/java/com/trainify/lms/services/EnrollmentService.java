package com.trainify.lms.services;

import com.trainify.lms.domain.entities.Course;
import com.trainify.lms.domain.entities.Enrollment;
import com.trainify.lms.domain.entities.Tenant;
import com.trainify.lms.domain.entities.User;
import com.trainify.lms.domain.enums.EnrollmentStatus;
import com.trainify.lms.dto.CourseDto;
import com.trainify.lms.dto.EnrollmentDto;
import com.trainify.lms.dto.UserDto;
import com.trainify.lms.repositories.CourseRepository;
import com.trainify.lms.repositories.EnrollmentRepository;
import com.trainify.lms.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityNotFoundException;
import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class EnrollmentService {

    private final EnrollmentRepository enrollmentRepository;
    private final CourseRepository courseRepository;
    private final UserRepository userRepository;
    private final com.trainify.lms.repositories.LessonRepository lessonRepository;
    private final com.trainify.lms.repositories.LessonProgressRepository lessonProgressRepository;

    @Transactional
    public EnrollmentDto enrollUser(UUID courseId, UUID userId, Tenant tenant) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new EntityNotFoundException("Course not found"));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));

        if (enrollmentRepository.existsByCourseIdAndUserId(courseId, userId)) {
            throw new IllegalStateException("User is already enrolled in this course");
        }

        Enrollment enrollment = new Enrollment();
        enrollment.setCourse(course);
        enrollment.setUser(user);
        enrollment.setTenant(tenant);
        enrollment.setStatus(EnrollmentStatus.IN_PROGRESS);
        enrollment.setEnrolledAt(Instant.now());

        try {
            enrollment = enrollmentRepository.save(enrollment);
        } catch (DataIntegrityViolationException e) {
            throw new IllegalStateException("User is already enrolled in this course");
        }

        return mapToDto(enrollment);
    }

    @Transactional(readOnly = true)
    public java.util.List<EnrollmentDto> getUserEnrollments(UUID userId) {
        return enrollmentRepository.findByUserId(userId).stream()
                .map(this::mapToDto)
                .collect(java.util.stream.Collectors.toList());
    }

    @Transactional(readOnly = true)
    public java.util.List<EnrollmentDto> getAllEnrollments(UUID tenantId) {
        return enrollmentRepository.findAll().stream()
                .filter(e -> e.getTenant().getId().equals(tenantId))
                .map(this::mapToDto)
                .collect(java.util.stream.Collectors.toList());
    }

    private EnrollmentDto mapToDto(Enrollment enrollment) {
        EnrollmentDto dto = new EnrollmentDto();
        dto.setId(enrollment.getId());
        dto.setStatus(enrollment.getStatus());
        dto.setEnrolledAt(enrollment.getEnrolledAt());
        dto.setCompletedAt(enrollment.getCompletedAt());

        if (enrollment.getUser() != null) {
            UserDto userDto = new UserDto();
            userDto.setId(enrollment.getUser().getId());
            userDto.setName(enrollment.getUser().getName());
            dto.setUser(userDto);
        }

        if (enrollment.getCourse() != null) {
            CourseDto courseDto = new CourseDto();
            courseDto.setId(enrollment.getCourse().getId());
            courseDto.setTitle(enrollment.getCourse().getTitle());
            dto.setCourse(courseDto);

            fillProgress(dto, enrollment);
        }

        return dto;
    }

    /**
     * Percentual de aulas concluidas no curso. Sem aulas cadastradas o progresso e
     * zero, em vez de dividir por zero.
     */
    private void fillProgress(EnrollmentDto dto, com.trainify.lms.domain.entities.Enrollment enrollment) {
        int total = (int) lessonRepository.countByModuleCourseId(enrollment.getCourse().getId());
        int completed = (int) lessonProgressRepository.countByEnrollmentIdAndStatus(
                enrollment.getId(), com.trainify.lms.domain.enums.ProgressStatus.COMPLETED);

        dto.setTotalLessons(total);
        dto.setCompletedLessons(Math.min(completed, total));
        dto.setProgressPercent(total == 0 ? 0 : (int) Math.round((double) dto.getCompletedLessons() * 100 / total));
    }
}
