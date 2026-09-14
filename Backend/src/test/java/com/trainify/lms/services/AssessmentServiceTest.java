package com.trainify.lms.services;

import com.trainify.lms.domain.entities.Assessment;
import com.trainify.lms.domain.entities.AssessmentOption;
import com.trainify.lms.domain.entities.AssessmentQuestion;
import com.trainify.lms.domain.entities.Course;
import com.trainify.lms.domain.entities.Enrollment;
import com.trainify.lms.domain.entities.Lesson;
import com.trainify.lms.domain.entities.Module;
import com.trainify.lms.dto.AssessmentResultDto;
import com.trainify.lms.dto.SubmitAssessmentRequest;
import com.trainify.lms.exceptions.LessonLockedException;
import com.trainify.lms.repositories.AssessmentRepository;
import com.trainify.lms.repositories.EnrollmentRepository;
import com.trainify.lms.repositories.LessonRepository;
import com.trainify.lms.repositories.UserAssessmentAnswerRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class AssessmentServiceTest {

    @Mock
    private AssessmentRepository assessmentRepository;

    @Mock
    private LessonRepository lessonRepository;

    @Mock
    private EnrollmentRepository enrollmentRepository;

    @Mock
    private UserAssessmentAnswerRepository answerRepository;

    @Mock
    private ProgressService progressService;

    @InjectMocks
    private AssessmentService assessmentService;

    private UUID userId;
    private UUID lessonId;
    private UUID courseId;
    private Lesson lesson;
    private Enrollment enrollment;
    private Assessment assessment;
    private AssessmentQuestion question;
    private AssessmentOption correctOption;
    private AssessmentOption wrongOption;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        lessonId = UUID.randomUUID();
        courseId = UUID.randomUUID();

        Course course = new Course();
        course.setId(courseId);

        Module module = new Module();
        module.setCourse(course);

        lesson = new Lesson();
        lesson.setId(lessonId);
        lesson.setModule(module);

        enrollment = new Enrollment();
        enrollment.setId(UUID.randomUUID());

        correctOption = option(true);
        wrongOption = option(false);

        question = new AssessmentQuestion();
        question.setId(UUID.randomUUID());
        question.setOptions(List.of(correctOption, wrongOption));

        assessment = new Assessment();
        assessment.setLesson(lesson);
        assessment.setPassingScore(70);
        assessment.setQuestions(new ArrayList<>(List.of(question)));
    }

    @Test
    void submitAssessment_Passed_CompletesLesson() {
        // Arrange
        stubAssessmentAndEnrollment();

        // Act
        AssessmentResultDto result = assessmentService.submitAssessment(lessonId, userId, answer(correctOption));

        // Assert
        assertTrue(result.isPassed());
        assertEquals(100, result.getScore());
        verify(progressService).assertLessonUnlocked(enrollment, lesson);
        verify(progressService).completeLesson(enrollment, lesson);
    }

    @Test
    void submitAssessment_Failed_DoesNotCompleteLesson() {
        // Arrange
        stubAssessmentAndEnrollment();

        // Act
        AssessmentResultDto result = assessmentService.submitAssessment(lessonId, userId, answer(wrongOption));

        // Assert
        assertFalse(result.isPassed());
        assertEquals(0, result.getScore());
        verify(progressService, never()).completeLesson(any(), any());
    }

    @Test
    void submitAssessment_LockedLesson_RejectsBeforeSavingAnswers() {
        // Arrange
        stubAssessmentAndEnrollment();
        doThrow(new LessonLockedException(lessonId)).when(progressService).assertLessonUnlocked(enrollment, lesson);

        // Act & Assert
        assertThrows(LessonLockedException.class,
                () -> assessmentService.submitAssessment(lessonId, userId, answer(correctOption)));
        verify(answerRepository, never()).save(any());
        verify(progressService, never()).completeLesson(any(), any());
    }

    private void stubAssessmentAndEnrollment() {
        when(assessmentRepository.findByLessonId(lessonId)).thenReturn(Optional.of(assessment));
        when(enrollmentRepository.findByUserIdAndCourseId(userId, courseId)).thenReturn(Optional.of(enrollment));
    }

    private SubmitAssessmentRequest answer(AssessmentOption selected) {
        SubmitAssessmentRequest request = new SubmitAssessmentRequest();
        request.setAnswers(Map.of(question.getId(), selected.getId()));
        return request;
    }

    private AssessmentOption option(boolean correct) {
        AssessmentOption option = new AssessmentOption();
        option.setId(UUID.randomUUID());
        option.setIsCorrect(correct);
        return option;
    }
}
