package com.trainify.lms.services;

import com.trainify.lms.domain.entities.Enrollment;
import com.trainify.lms.domain.entities.Lesson;
import com.trainify.lms.domain.entities.LessonProgress;
import com.trainify.lms.domain.entities.Module;
import com.trainify.lms.domain.enums.ProgressStatus;
import com.trainify.lms.dto.HeartbeatRequest;
import com.trainify.lms.dto.LessonProgressDto;
import com.trainify.lms.exceptions.LessonLockedException;
import com.trainify.lms.repositories.EnrollmentRepository;
import com.trainify.lms.repositories.LessonProgressRepository;
import com.trainify.lms.repositories.LessonRepository;
import com.trainify.lms.repositories.ModuleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProgressService {

    private final LessonProgressRepository lessonProgressRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final LessonRepository lessonRepository;
    private final ModuleRepository moduleRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional(readOnly = true)
    public com.trainify.lms.domain.entities.LessonProgress getLessonProgress(UUID enrollmentId, UUID lessonId, UUID userId) {
        findOwnedEnrollment(enrollmentId, userId);

        return lessonProgressRepository.findByEnrollmentIdAndLessonId(enrollmentId, lessonId)
                .orElse(null);
    }

    /**
     * Progresso de todas as aulas do curso da matricula, na mesma ordem do player
     * (modulo, depois aula), com o bloqueio de cada aula ja calculado.
     */
    @Transactional(readOnly = true)
    public List<LessonProgressDto> getCourseProgress(UUID enrollmentId, UUID userId) {
        Enrollment enrollment = findOwnedEnrollment(enrollmentId, userId);

        Map<UUID, LessonProgress> progressByLesson = lessonProgressRepository.findByEnrollmentId(enrollmentId).stream()
                .collect(Collectors.toMap(p -> p.getLesson().getId(), Function.identity()));

        List<LessonProgressDto> result = new ArrayList<>();
        boolean previousCompleted = true;

        for (Lesson lesson : findCourseLessonsInOrder(enrollment.getCourse().getId())) {
            LessonProgress progress = progressByLesson.get(lesson.getId());
            ProgressStatus status = progress != null ? progress.getStatus() : ProgressStatus.NOT_STARTED;

            LessonProgressDto dto = new LessonProgressDto();
            dto.setLessonId(lesson.getId());
            dto.setStatus(status);
            dto.setWatchedSeconds(progress != null ? progress.getWatchedSeconds() : 0);
            dto.setLocked(isLocked(previousCompleted, status));
            result.add(dto);

            previousCompleted = status == ProgressStatus.COMPLETED;
        }

        return result;
    }

    @Transactional
    public void recordHeartbeat(UUID enrollmentId, UUID lessonId, HeartbeatRequest request, UUID userId) {
        Enrollment enrollment = findOwnedEnrollment(enrollmentId, userId);

        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new IllegalArgumentException("Lesson not found"));

        LessonProgress progress = findOrCreateProgress(enrollment, lesson);
        assertLessonUnlocked(enrollment, lesson, progress.getStatus());

        progress.setWatchedSeconds(request.getWatchedSeconds());
        progress.setUpdatedAt(Instant.now());

        if (request.getWatchedSeconds() > 0 && progress.getStatus() == ProgressStatus.NOT_STARTED) {
            progress.setStatus(ProgressStatus.IN_PROGRESS);
        }

        if (request.getIsCompleted() && progress.getStatus() != ProgressStatus.COMPLETED) {
            progress.setStatus(ProgressStatus.COMPLETED);
        }

        lessonProgressRepository.save(progress);

        // Dispara evento para recalcular o progresso total do curso (Async)
        eventPublisher.publishEvent(new EnrollmentProgressEvent(enrollmentId));
    }

    /**
     * Conclui a aula para a matricula. Usado quando o aluno passa na avaliacao:
     * quiz nao envia heartbeat, entao nunca contava para o progresso do curso.
     */
    @Transactional
    public void completeLesson(Enrollment enrollment, Lesson lesson) {
        LessonProgress progress = findOrCreateProgress(enrollment, lesson);
        assertLessonUnlocked(enrollment, lesson, progress.getStatus());

        if (progress.getStatus() == ProgressStatus.COMPLETED) {
            return;
        }

        progress.setStatus(ProgressStatus.COMPLETED);
        progress.setUpdatedAt(Instant.now());
        lessonProgressRepository.save(progress);

        eventPublisher.publishEvent(new EnrollmentProgressEvent(enrollment.getId()));
    }

    /**
     * Garante que a aula pertence ao curso da matricula e esta liberada.
     */
    public void assertLessonUnlocked(Enrollment enrollment, Lesson lesson) {
        ProgressStatus status = lessonProgressRepository.findByEnrollmentIdAndLessonId(enrollment.getId(), lesson.getId())
                .map(LessonProgress::getStatus)
                .orElse(ProgressStatus.NOT_STARTED);

        assertLessonUnlocked(enrollment, lesson, status);
    }

    // Regra de bloqueio (proposta, a confirmar com o time): a primeira aula e
    // sempre liberada e as demais so depois que a anterior foi concluida. Aula
    // que ja tem progresso nunca volta a bloquear, para nao prender quem tem
    // historico anterior a regra ou fez o curso antes de ele ser reordenado.
    static boolean isLocked(boolean previousLessonCompleted, ProgressStatus status) {
        return !previousLessonCompleted && status == ProgressStatus.NOT_STARTED;
    }

    private void assertLessonUnlocked(Enrollment enrollment, Lesson lesson, ProgressStatus status) {
        UUID courseId = enrollment.getCourse().getId();

        // Sem essa checagem, progresso de aula de outro curso inflava a porcentagem da matricula
        if (!lesson.getModule().getCourse().getId().equals(courseId)) {
            throw new IllegalArgumentException("Lesson does not belong to the enrollment course");
        }

        // Aula com progresso nunca bloqueia, entao so a primeira interacao consulta a ordem do curso
        if (status != ProgressStatus.NOT_STARTED) {
            return;
        }

        List<Lesson> lessons = findCourseLessonsInOrder(courseId);
        int index = -1;
        for (int i = 0; i < lessons.size(); i++) {
            if (lessons.get(i).getId().equals(lesson.getId())) {
                index = i;
                break;
            }
        }

        if (index <= 0) {
            return;
        }

        UUID previousLessonId = lessons.get(index - 1).getId();
        boolean previousCompleted = lessonProgressRepository.findByEnrollmentIdAndLessonId(enrollment.getId(), previousLessonId)
                .map(p -> p.getStatus() == ProgressStatus.COMPLETED)
                .orElse(false);

        if (isLocked(previousCompleted, status)) {
            throw new LessonLockedException(lesson.getId());
        }
    }

    // Mesma ordem usada pelo CourseService para montar o curso exibido no player
    private List<Lesson> findCourseLessonsInOrder(UUID courseId) {
        List<Lesson> lessons = new ArrayList<>();
        for (Module module : moduleRepository.findByCourseIdOrderByOrderIndexAsc(courseId)) {
            lessons.addAll(lessonRepository.findByModuleIdOrderByOrderIndexAsc(module.getId()));
        }
        return lessons;
    }

    private Enrollment findOwnedEnrollment(UUID enrollmentId, UUID userId) {
        Enrollment enrollment = enrollmentRepository.findById(enrollmentId)
                .orElseThrow(() -> new IllegalArgumentException("Enrollment not found"));

        if (!enrollment.getUser().getId().equals(userId)) {
            throw new org.springframework.security.access.AccessDeniedException("Enrollment does not belong to user");
        }

        return enrollment;
    }

    private LessonProgress findOrCreateProgress(Enrollment enrollment, Lesson lesson) {
        return lessonProgressRepository.findByEnrollmentIdAndLessonId(enrollment.getId(), lesson.getId())
                .orElseGet(() -> {
                    LessonProgress newProgress = new LessonProgress();
                    newProgress.setTenant(enrollment.getTenant());
                    newProgress.setEnrollment(enrollment);
                    newProgress.setLesson(lesson);
                    newProgress.setStatus(ProgressStatus.NOT_STARTED);
                    return newProgress;
                });
    }
}
