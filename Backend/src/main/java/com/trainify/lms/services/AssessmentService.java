package com.trainify.lms.services;

import com.trainify.lms.domain.entities.*;
import com.trainify.lms.dto.*;
import com.trainify.lms.repositories.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityNotFoundException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AssessmentService {

    private final AssessmentRepository assessmentRepository;
    private final LessonRepository lessonRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final UserAssessmentAnswerRepository answerRepository;

    @Transactional(readOnly = true)
    public AssessmentDto getAssessmentByLessonId(UUID lessonId) {
        return assessmentRepository.findByLessonId(lessonId)
                .map(this::mapToDto)
                .orElseThrow(() -> new EntityNotFoundException("Assessment not found for lesson " + lessonId));
    }

    @Transactional
    public AssessmentDto createOrUpdateAssessment(UUID lessonId, CreateAssessmentRequest request, UUID tenantId) {
        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new EntityNotFoundException("Lesson not found"));

        Assessment assessment = assessmentRepository.findByLessonId(lessonId).orElse(new Assessment());
        assessment.setLesson(lesson);
        Tenant t = new Tenant();
        t.setId(tenantId);
        assessment.setTenant(t);
        assessment.setTitle(request.getTitle());
        assessment.setPassingScore(request.getPassingScore());
        
        if (assessment.getQuestions() == null) {
            assessment.setQuestions(new ArrayList<>());
        } else {
            assessment.getQuestions().clear();
        }

        int qIndex = 0;
        if (request.getQuestions() != null) {
            for (CreateAssessmentRequest.QuestionRequest qr : request.getQuestions()) {
                AssessmentQuestion q = new AssessmentQuestion();
                q.setAssessment(assessment);
                q.setTenant(t);
                q.setQuestionText(qr.getText());
                q.setQuestionType(com.trainify.lms.domain.enums.QuestionType.MULTIPLE_CHOICE);
                q.setOrderIndex(qIndex++);
                
                List<AssessmentOption> options = new ArrayList<>();
                if (qr.getOptions() != null) {
                    for (CreateAssessmentRequest.OptionRequest or : qr.getOptions()) {
                        AssessmentOption opt = new AssessmentOption();
                        opt.setQuestion(q);
                        opt.setTenant(t);
                        opt.setOptionText(or.getText());
                        opt.setIsCorrect(or.getIsCorrect());
                        options.add(opt);
                    }
                }
                q.setOptions(options);
                assessment.getQuestions().add(q);
            }
        }

        return mapToDto(assessmentRepository.save(assessment));
    }

    @Transactional
    public AssessmentResultDto submitAssessment(UUID lessonId, UUID userId, SubmitAssessmentRequest request) {
        Assessment assessment = assessmentRepository.findByLessonId(lessonId)
                .orElseThrow(() -> new EntityNotFoundException("Assessment not found for lesson " + lessonId));

        Enrollment enrollment = enrollmentRepository.findByUserIdAndCourseId(userId, assessment.getLesson().getModule().getCourse().getId())
                .orElseThrow(() -> new EntityNotFoundException("Enrollment not found"));

        int correctAnswers = 0;
        int totalQuestions = assessment.getQuestions().size();

        for (AssessmentQuestion question : assessment.getQuestions()) {
            UUID selectedOptionId = request.getAnswers().get(question.getId());
            boolean isCorrect = false;

            if (selectedOptionId != null) {
                isCorrect = question.getOptions().stream()
                        .anyMatch(opt -> opt.getId().equals(selectedOptionId) && opt.getIsCorrect());
            }

            if (isCorrect) correctAnswers++;

            UserAssessmentAnswer answer = new UserAssessmentAnswer();
            answer.setTenant(assessment.getTenant());
            answer.setEnrollment(enrollment);
            answer.setQuestion(question);
            if (selectedOptionId != null) {
                AssessmentOption selected = new AssessmentOption();
                selected.setId(selectedOptionId);
                answer.setSelectedOption(selected);
            }
            answer.setIsCorrect(isCorrect);
            answerRepository.save(answer);
        }

        int score = totalQuestions > 0 ? (correctAnswers * 100) / totalQuestions : 0;
        boolean passed = score >= assessment.getPassingScore();

        AssessmentResultDto result = new AssessmentResultDto();
        result.setScore(score);
        result.setTotalQuestions(totalQuestions);
        result.setPassingScore(assessment.getPassingScore());
        result.setPassed(passed);
        
        return result;
    }

    private AssessmentDto mapToDto(Assessment assessment) {
        AssessmentDto dto = new AssessmentDto();
        dto.setId(assessment.getId());
        dto.setTitle(assessment.getTitle());
        dto.setPassingScore(assessment.getPassingScore());

        if (assessment.getQuestions() != null) {
            dto.setQuestions(assessment.getQuestions().stream()
                    .map(this::mapQuestionToDto)
                    .collect(Collectors.toList()));
        }

        return dto;
    }

    private AssessmentDto.QuestionDto mapQuestionToDto(AssessmentQuestion question) {
        AssessmentDto.QuestionDto dto = new AssessmentDto.QuestionDto();
        dto.setId(question.getId());
        dto.setText(question.getQuestionText());

        if (question.getOptions() != null) {
            dto.setOptions(question.getOptions().stream()
                    .map(this::mapOptionToDto)
                    .collect(Collectors.toList()));
        }

        return dto;
    }

    private AssessmentDto.OptionDto mapOptionToDto(AssessmentOption option) {
        AssessmentDto.OptionDto dto = new AssessmentDto.OptionDto();
        dto.setId(option.getId());
        dto.setText(option.getOptionText());
        return dto;
    }
}
