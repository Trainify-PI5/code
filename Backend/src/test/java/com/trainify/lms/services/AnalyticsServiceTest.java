package com.trainify.lms.services;

import com.trainify.lms.domain.entities.Course;
import com.trainify.lms.domain.entities.Enrollment;
import com.trainify.lms.domain.enums.EngagementPeriod;
import com.trainify.lms.domain.enums.EnrollmentStatus;
import com.trainify.lms.dto.CourseCompletionDto;
import com.trainify.lms.dto.EngagementPointDto;
import com.trainify.lms.dto.KpiDto;
import com.trainify.lms.dto.StatusCountDto;
import com.trainify.lms.repositories.CourseRepository;
import com.trainify.lms.repositories.EnrollmentRepository;
import com.trainify.lms.repositories.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.repository.query.parser.PartTree;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class AnalyticsServiceTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 9, 13);

    @Mock
    private UserRepository userRepository;

    @Mock
    private CourseRepository courseRepository;

    @Mock
    private EnrollmentRepository enrollmentRepository;

    @InjectMocks
    private AnalyticsService analyticsService;

    @Test
    void getTenantKpis_CountsCompletedInDatabaseWithoutLoadingEnrollments() {
        // Arrange
        when(userRepository.count()).thenReturn(40L);
        when(courseRepository.count()).thenReturn(6L);
        when(enrollmentRepository.count()).thenReturn(25L);
        when(enrollmentRepository.countByStatus(EnrollmentStatus.COMPLETED)).thenReturn(10L);

        // Act
        KpiDto kpis = analyticsService.getTenantKpis();

        // Assert: mesmo calculo de antes (ativas = total - concluidas)
        assertEquals(40, kpis.getTotalUsers());
        assertEquals(6, kpis.getTotalCourses());
        assertEquals(15, kpis.getActiveEnrollments());
        assertEquals(10, kpis.getCompletedEnrollments());
        verify(enrollmentRepository, never()).findAll();
    }

    @Test
    void getEnrollmentStatusDistribution_ReturnsEveryStatusIncludingZero() {
        // Arrange
        when(enrollmentRepository.countByStatus(EnrollmentStatus.IN_PROGRESS)).thenReturn(7L);
        when(enrollmentRepository.countByStatus(EnrollmentStatus.COMPLETED)).thenReturn(3L);
        when(enrollmentRepository.countByStatus(EnrollmentStatus.CANCELLED)).thenReturn(0L);

        // Act
        List<StatusCountDto> result = analyticsService.getEnrollmentStatusDistribution();

        // Assert
        assertEquals(List.of(
                new StatusCountDto(EnrollmentStatus.IN_PROGRESS, 7),
                new StatusCountDto(EnrollmentStatus.COMPLETED, 3),
                new StatusCountDto(EnrollmentStatus.CANCELLED, 0)), result);
    }

    @Test
    void getCourseCompletion_ComputesRateSkipsCoursesWithoutEnrollmentsAndSortsByRate() {
        // Arrange
        Course java = course("Java");
        Course sql = course("SQL");
        Course empty = course("Sem alunos");

        when(courseRepository.findAll()).thenReturn(List.of(java, sql, empty));
        when(enrollmentRepository.countByCourseId(java.getId())).thenReturn(3L);
        when(enrollmentRepository.countByCourseIdAndStatus(java.getId(), EnrollmentStatus.COMPLETED)).thenReturn(1L);
        when(enrollmentRepository.countByCourseId(sql.getId())).thenReturn(4L);
        when(enrollmentRepository.countByCourseIdAndStatus(sql.getId(), EnrollmentStatus.COMPLETED)).thenReturn(3L);
        when(enrollmentRepository.countByCourseId(empty.getId())).thenReturn(0L);

        // Act
        List<CourseCompletionDto> result = analyticsService.getCourseCompletion();

        // Assert
        assertEquals(2, result.size());

        assertEquals("SQL", result.get(0).getTitle());
        assertEquals(75, result.get(0).getCompletionRate());

        assertEquals("Java", result.get(1).getTitle());
        assertEquals(java.getId(), result.get(1).getCourseId());
        assertEquals(3, result.get(1).getEnrollments());
        assertEquals(1, result.get(1).getCompleted());
        assertEquals(33, result.get(1).getCompletionRate());

        verify(enrollmentRepository, never()).countByCourseIdAndStatus(empty.getId(), EnrollmentStatus.COMPLETED);
    }

    @Test
    void getEngagement_Last30Days_SplitsIntoWeeklyBucketsEndingToday() {
        // Arrange
        when(enrollmentRepository.countByEnrolledAtGreaterThanEqualAndEnrolledAtLessThan(any(), any())).thenReturn(2L);
        when(enrollmentRepository.countByCompletedAtGreaterThanEqualAndCompletedAtLessThan(any(), any())).thenReturn(1L);

        // Act
        List<EngagementPointDto> points = analyticsService.getEngagement(EngagementPeriod.LAST_30_DAYS, TODAY);

        // Assert: 30 dias (15/08 a 13/09) em blocos de 7 dias, o ultimo parcial
        assertEquals(List.of(
                        LocalDate.of(2026, 8, 15), LocalDate.of(2026, 8, 22), LocalDate.of(2026, 8, 29),
                        LocalDate.of(2026, 9, 5), LocalDate.of(2026, 9, 12)),
                points.stream().map(EngagementPointDto::getPeriodStart).toList());
        assertEquals(2, points.get(0).getEnrollments());
        assertEquals(1, points.get(0).getCompletions());

        // O primeiro bloco comeca no inicio do dia e o ultimo termina no fim de hoje (exclusivo)
        verify(enrollmentRepository).countByEnrolledAtGreaterThanEqualAndEnrolledAtLessThan(utc(2026, 8, 15), utc(2026, 8, 22));
        verify(enrollmentRepository).countByEnrolledAtGreaterThanEqualAndEnrolledAtLessThan(utc(2026, 9, 12), utc(2026, 9, 14));
        verify(enrollmentRepository).countByCompletedAtGreaterThanEqualAndCompletedAtLessThan(utc(2026, 9, 12), utc(2026, 9, 14));
    }

    @Test
    void getEngagement_LastQuarter_Has13WeeklyBuckets() {
        // Act
        List<EngagementPointDto> points = analyticsService.getEngagement(EngagementPeriod.LAST_QUARTER, TODAY);

        // Assert
        assertEquals(13, points.size());
        assertEquals(TODAY.minusDays(89), points.get(0).getPeriodStart());
        verify(enrollmentRepository).countByEnrolledAtGreaterThanEqualAndEnrolledAtLessThan(utc(2026, 9, 8), utc(2026, 9, 14));
    }

    @Test
    void getEngagement_YearToDate_UsesMonthlyBuckets() {
        // Act
        List<EngagementPointDto> points = analyticsService.getEngagement(EngagementPeriod.YEAR_TO_DATE, TODAY);

        // Assert
        assertEquals(9, points.size());
        assertEquals(LocalDate.of(2026, 1, 1), points.get(0).getPeriodStart());
        assertEquals(LocalDate.of(2026, 9, 1), points.get(8).getPeriodStart());
        verify(enrollmentRepository).countByCompletedAtGreaterThanEqualAndCompletedAtLessThan(utc(2026, 1, 1), utc(2026, 2, 1));
        verify(enrollmentRepository).countByCompletedAtGreaterThanEqualAndCompletedAtLessThan(utc(2026, 9, 1), utc(2026, 9, 14));
    }

    @Test
    void enrollmentRepository_DerivedQueriesReferenceExistingProperties() {
        // Queries derivadas so sao validadas quando o Spring sobe com banco; o PartTree
        // faz a mesma leitura do nome do metodo contra a entidade, sem precisar de banco
        for (String method : List.of(
                "countByStatus",
                "countByCourseId",
                "countByCourseIdAndStatus",
                "countByEnrolledAtGreaterThanEqualAndEnrolledAtLessThan",
                "countByCompletedAtGreaterThanEqualAndCompletedAtLessThan")) {
            assertDoesNotThrow(() -> new PartTree(method, Enrollment.class), method);
        }

        // Controle: propriedade inexistente precisa falhar, senao o teste acima nao prova nada
        org.junit.jupiter.api.Assertions.assertThrows(org.springframework.data.mapping.PropertyReferenceException.class,
                () -> new PartTree("countByEnroledAt", Enrollment.class));
    }

    private Course course(String title) {
        Course course = new Course();
        course.setId(UUID.randomUUID());
        course.setTitle(title);
        return course;
    }

    private Instant utc(int year, int month, int day) {
        return LocalDate.of(year, month, day).atStartOfDay(ZoneOffset.UTC).toInstant();
    }
}
