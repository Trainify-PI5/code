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
import com.trainify.lms.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final UserRepository userRepository;
    private final CourseRepository courseRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final com.trainify.lms.repositories.AssessmentAttemptRepository attemptRepository;

    @Transactional(readOnly = true)
    public KpiDto getTenantKpis() {
        UUID tenantId = currentTenantId();
        long totalUsers = userRepository.countByTenantId(tenantId);
        long totalCourses = courseRepository.countByTenantId(tenantId);

        // Contagem feita no banco; antes todas as matriculas eram carregadas em memoria
        long completed = enrollmentRepository.countByTenantIdAndStatus(tenantId, EnrollmentStatus.COMPLETED);
        // Matriculas canceladas nao contam como ativas
        long active = enrollmentRepository.countByTenantIdAndStatus(tenantId, EnrollmentStatus.IN_PROGRESS);

        return KpiDto.builder()
                .averageScore(averageScore(tenantId))
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
        UUID tenantId = currentTenantId();
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
                    enrollmentRepository.countByTenantIdAndEnrolledAtGreaterThanEqualAndEnrolledAtLessThan(tenantId, from, to),
                    enrollmentRepository.countByTenantIdAndCompletedAtGreaterThanEqualAndCompletedAtLessThan(tenantId, from, to)));

            bucketStart = next;
        }

        return points;
    }

    @Transactional(readOnly = true)
    public List<StatusCountDto> getEnrollmentStatusDistribution() {
        UUID tenantId = currentTenantId();
        return Arrays.stream(EnrollmentStatus.values())
                .map(status -> new StatusCountDto(status, enrollmentRepository.countByTenantIdAndStatus(tenantId, status)))
                .toList();
    }

    /**
     * Taxa de conclusao por curso, da maior para a menor. Cursos sem matricula ficam
     * de fora, ja que nao tem taxa a mostrar.
     */
    @Transactional(readOnly = true)
    public List<CourseCompletionDto> getCourseCompletion() {
        UUID tenantId = currentTenantId();
        List<CourseCompletionDto> result = new ArrayList<>();

        for (Course course : courseRepository.findByTenantId(tenantId)) {
            long enrollments = enrollmentRepository.countByTenantIdAndCourseId(tenantId, course.getId());
            if (enrollments == 0) {
                continue;
            }

            long completed = enrollmentRepository.countByTenantIdAndCourseIdAndStatus(
                    tenantId, course.getId(), EnrollmentStatus.COMPLETED);
            int completionRate = (int) Math.round((double) completed * 100 / enrollments);

            result.add(new CourseCompletionDto(course.getId(), course.getTitle(), enrollments, completed, completionRate));
        }

        result.sort(Comparator.comparingInt(CourseCompletionDto::getCompletionRate).reversed()
                .thenComparing(CourseCompletionDto::getTitle));
        return result;
    }

    /**
     * Empresa do usuario logado. O isolamento por empresa e feito aqui, na aplicacao:
     * as policies de RLS do banco nao filtram o usuario usado pela aplicacao.
     */
    private UUID currentTenantId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof CustomUserDetails userDetails)) {
            throw new IllegalStateException("Nenhum usuario autenticado na requisicao");
        }
        return userDetails.getTenantId();
    }

    /**
     * Media considerando a melhor nota de cada aluno em cada avaliacao: repetir a
     * prova nao deve puxar a media da empresa para baixo. Sem tentativas devolve -1,
     * para a tela mostrar um traco em vez de fingir que a media e zero.
     */
    private int averageScore(UUID tenantId) {
        var melhores = new java.util.HashMap<String, Integer>();
        for (var attempt : attemptRepository.findByTenantId(tenantId)) {
            String chave = attempt.getEnrollment().getId() + ":" + attempt.getAssessment().getId();
            melhores.merge(chave, attempt.getScore(), Math::max);
        }

        if (melhores.isEmpty()) {
            return -1;
        }
        return (int) Math.round(melhores.values().stream().mapToInt(Integer::intValue).average().orElse(0));
    }

    private Instant startOfDay(LocalDate date) {
        return date.atStartOfDay(ZoneOffset.UTC).toInstant();
    }
}
