package com.trainify.lms.services;

import com.trainify.lms.domain.entities.Course;
import com.trainify.lms.domain.enums.EngagementPeriod;
import com.trainify.lms.domain.enums.EnrollmentStatus;
import com.trainify.lms.dto.CourseCompletionDto;
import com.trainify.lms.dto.EngagementPointDto;
import com.trainify.lms.dto.KpiDto;
import com.trainify.lms.dto.StatusCountDto;
import com.trainify.lms.repositories.CourseRepository;
import com.trainify.lms.repositories.EnrollmentRepository;
import com.trainify.lms.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;

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

        // Contagem feita no banco; antes todas as matriculas eram carregadas em memoria
        long completed = enrollmentRepository.countByStatus(EnrollmentStatus.COMPLETED);
        long active = totalEnrollments - completed;

        return KpiDto.builder()
                .totalUsers(totalUsers)
                .totalCourses(totalCourses)
                .activeEnrollments(active)
                .completedEnrollments(completed)
                .build();
    }

    /**
     * Matriculas e conclusoes ao longo do periodo: blocos de 7 dias para os ultimos
     * 30 dias e para o trimestre, blocos mensais para o ano ate hoje. O ultimo bloco
     * termina no fim do dia de hoje e pode ser parcial.
     */
    @Transactional(readOnly = true)
    public List<EngagementPointDto> getEngagement(EngagementPeriod period) {
        return getEngagement(period, LocalDate.now(ZoneOffset.UTC));
    }

    List<EngagementPointDto> getEngagement(EngagementPeriod period, LocalDate today) {
        LocalDate end = today.plusDays(1);
        LocalDate bucketStart = switch (period) {
            case LAST_30_DAYS -> today.minusDays(29);
            case LAST_QUARTER -> today.minusDays(89);
            case YEAR_TO_DATE -> today.withDayOfYear(1);
        };

        List<EngagementPointDto> points = new ArrayList<>();
        while (bucketStart.isBefore(end)) {
            LocalDate next = period == EngagementPeriod.YEAR_TO_DATE
                    ? bucketStart.plusMonths(1)
                    : bucketStart.plusDays(7);
            LocalDate bucketEnd = next.isAfter(end) ? end : next;

            Instant from = startOfDay(bucketStart);
            Instant to = startOfDay(bucketEnd);

            points.add(new EngagementPointDto(
                    bucketStart,
                    enrollmentRepository.countByEnrolledAtGreaterThanEqualAndEnrolledAtLessThan(from, to),
                    enrollmentRepository.countByCompletedAtGreaterThanEqualAndCompletedAtLessThan(from, to)));

            bucketStart = next;
        }

        return points;
    }

    @Transactional(readOnly = true)
    public List<StatusCountDto> getEnrollmentStatusDistribution() {
        return Arrays.stream(EnrollmentStatus.values())
                .map(status -> new StatusCountDto(status, enrollmentRepository.countByStatus(status)))
                .toList();
    }

    /**
     * Taxa de conclusao por curso, da maior para a menor. Cursos sem matricula ficam
     * de fora, ja que nao tem taxa a mostrar.
     */
    @Transactional(readOnly = true)
    public List<CourseCompletionDto> getCourseCompletion() {
        List<CourseCompletionDto> result = new ArrayList<>();

        for (Course course : courseRepository.findAll()) {
            long enrollments = enrollmentRepository.countByCourseId(course.getId());
            if (enrollments == 0) {
                continue;
            }

            long completed = enrollmentRepository.countByCourseIdAndStatus(course.getId(), EnrollmentStatus.COMPLETED);
            int completionRate = (int) Math.round((double) completed * 100 / enrollments);

            result.add(new CourseCompletionDto(course.getId(), course.getTitle(), enrollments, completed, completionRate));
        }

        result.sort(Comparator.comparingInt(CourseCompletionDto::getCompletionRate).reversed()
                .thenComparing(CourseCompletionDto::getTitle));
        return result;
    }

    private Instant startOfDay(LocalDate date) {
        return date.atStartOfDay(ZoneOffset.UTC).toInstant();
    }
}
