package com.trainify.lms.services;

import com.trainify.lms.domain.entities.*;
import com.trainify.lms.dto.*;
import com.trainify.lms.exceptions.AssessmentAttemptsExhaustedException;
import com.trainify.lms.repositories.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityNotFoundException;
import java.util.ArrayList;
import java.util.Comparator;
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
    private final AssessmentAttemptRepository attemptRepository;
    private final ProgressService progressService;

    /**
     * Avaliacao da aula com a situacao do aluno: quantas tentativas ja usou, quantas
     * restam e se ja foi aprovado. Quem ensina nao tem matricula, entao recebe apenas
     * a avaliacao.
     */
    @Transactional(readOnly = true)
    public AssessmentDto getAssessmentByLessonId(UUID lessonId, UUID userId) {
        Assessment assessment = assessmentRepository.findByLessonId(lessonId)
                .orElseThrow(() -> new EntityNotFoundException("Assessment not found for lesson " + lessonId));

        AssessmentDto dto = mapToDto(assessment);

        enrollmentRepository
                .findByUserIdAndCourseId(userId, assessment.getLesson().getModule().getCourse().getId())
                .ifPresent(enrollment -> {
                    List<AssessmentAttempt> attempts = attemptRepository
                            .findByEnrollmentIdAndAssessmentIdOrderByAttemptNumberAsc(enrollment.getId(), assessment.getId());

                    dto.setAttemptsUsed(attempts.size());
                    dto.setAttemptsRemaining(Math.max(0, assessment.getMaxAttempts() - attempts.size()));
                    dto.setAlreadyPassed(attempts.stream().anyMatch(AssessmentAttempt::getPassed));
                    attempts.stream()
                            .map(AssessmentAttempt::getScore)
                            .max(Comparator.naturalOrder())
                            .ifPresent(dto::setBestScore);
                });

        return dto;
    }

    @Transactional
    public AssessmentDto createOrUpdateAssessment(UUID lessonId, CreateAssessmentRequest request, UUID tenantId) {
        validate(request);

        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new EntityNotFoundException("Lesson not found"));

        Assessment assessment = assessmentRepository.findByLessonId(lessonId).orElse(new Assessment());
        assessment.setLesson(lesson);
        Tenant t = new Tenant();
        t.setId(tenantId);
        assessment.setTenant(t);
        assessment.setTitle(request.getTitle());
        assessment.setPassingScore(request.getPassingScore());
        assessment.setMaxAttempts(request.getMaxAttempts() == null ? 3 : request.getMaxAttempts());

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

    /**
     * Um quiz sem pergunta, sem alternativas ou sem gabarito e impossivel de responder.
     * Antes o sistema aceitava e o aluno so descobria na hora da prova.
     */
    static void validate(CreateAssessmentRequest request) {
        List<CreateAssessmentRequest.QuestionRequest> questions = request.getQuestions();
        if (questions == null || questions.isEmpty()) {
            throw new IllegalArgumentException("A avaliação precisa de pelo menos uma pergunta.");
        }

        for (int i = 0; i < questions.size(); i++) {
            CreateAssessmentRequest.QuestionRequest question = questions.get(i);
            int numero = i + 1;

            List<CreateAssessmentRequest.OptionRequest> options = question.getOptions();
            if (options == null || options.size() < 2) {
                throw new IllegalArgumentException("A pergunta " + numero + " precisa de pelo menos duas alternativas.");
            }

            if (options.stream().anyMatch(o -> o.getText() == null || o.getText().isBlank())) {
                throw new IllegalArgumentException("A pergunta " + numero + " tem alternativa sem texto.");
            }

            long corretas = options.stream().filter(o -> Boolean.TRUE.equals(o.getIsCorrect())).count();
            if (corretas != 1) {
                throw new IllegalArgumentException("A pergunta " + numero + " precisa de exatamente uma alternativa correta.");
            }
        }
    }

    @Transactional
    public AssessmentResultDto submitAssessment(UUID lessonId, UUID userId, SubmitAssessmentRequest request) {
        Assessment assessment = assessmentRepository.findByLessonId(lessonId)
                .orElseThrow(() -> new EntityNotFoundException("Assessment not found for lesson " + lessonId));

        Enrollment enrollment = enrollmentRepository
                .findByUserIdAndCourseId(userId, assessment.getLesson().getModule().getCourse().getId())
                .orElseThrow(() -> new EntityNotFoundException("Enrollment not found"));

        // Avaliacao de aula bloqueada e recusada antes de gravar qualquer resposta
        progressService.assertLessonUnlocked(enrollment, assessment.getLesson());

        List<AssessmentAttempt> anteriores = attemptRepository
                .findByEnrollmentIdAndAssessmentIdOrderByAttemptNumberAsc(enrollment.getId(), assessment.getId());

        if (anteriores.stream().anyMatch(AssessmentAttempt::getPassed)) {
            throw new AssessmentAttemptsExhaustedException("Você já foi aprovado nesta avaliação.");
        }

        int maxAttempts = assessment.getMaxAttempts() == null ? 3 : assessment.getMaxAttempts();
        if (anteriores.size() >= maxAttempts) {
            throw new AssessmentAttemptsExhaustedException(
                    "Você já usou as " + maxAttempts + " tentativas desta avaliação. Procure o instrutor.");
        }

        AssessmentAttempt attempt = new AssessmentAttempt();
        attempt.setTenant(assessment.getTenant());
        attempt.setEnrollment(enrollment);
        attempt.setAssessment(assessment);
        attempt.setAttemptNumber(anteriores.size() + 1);
        attempt.setScore(0);
        attempt.setPassed(false);
        attempt = attemptRepository.save(attempt);

        int correctAnswers = 0;
        int totalQuestions = assessment.getQuestions().size();
        List<AssessmentResultDto.QuestionResultDto> review = new ArrayList<>();

        for (AssessmentQuestion question : assessment.getQuestions()) {
            UUID selectedOptionId = request.getAnswers().get(question.getId());

            AssessmentOption correctOption = question.getOptions().stream()
                    .filter(o -> Boolean.TRUE.equals(o.getIsCorrect()))
                    .findFirst()
                    .orElse(null);

            AssessmentOption selectedOption = selectedOptionId == null ? null
                    : question.getOptions().stream()
                            .filter(o -> o.getId().equals(selectedOptionId))
                            .findFirst()
                            .orElse(null);

            boolean isCorrect = selectedOption != null && Boolean.TRUE.equals(selectedOption.getIsCorrect());
            if (isCorrect) correctAnswers++;

            UserAssessmentAnswer answer = new UserAssessmentAnswer();
            answer.setTenant(assessment.getTenant());
            answer.setEnrollment(enrollment);
            answer.setAttempt(attempt);
            answer.setQuestion(question);
            answer.setSelectedOption(selectedOption);
            answer.setIsCorrect(isCorrect);
            answerRepository.save(answer);

            AssessmentResultDto.QuestionResultDto item = new AssessmentResultDto.QuestionResultDto();
            item.setQuestionId(question.getId());
            item.setText(question.getQuestionText());
            item.setCorrect(isCorrect);
            if (selectedOption != null) {
                item.setSelectedOptionId(selectedOption.getId());
                item.setSelectedOptionText(selectedOption.getOptionText());
            }
            if (correctOption != null) {
                item.setCorrectOptionId(correctOption.getId());
                item.setCorrectOptionText(correctOption.getOptionText());
            }
            review.add(item);
        }

        int score = totalQuestions > 0 ? (correctAnswers * 100) / totalQuestions : 0;
        boolean passed = score >= assessment.getPassingScore();

        attempt.setScore(score);
        attempt.setPassed(passed);
        attemptRepository.save(attempt);

        // Passar na avaliacao conclui a aula; sem isso o quiz nunca contava para o
        // progresso do curso, nao liberava a aula seguinte e impedia o certificado
        if (passed) {
            progressService.completeLesson(enrollment, assessment.getLesson());
        }

        AssessmentResultDto result = new AssessmentResultDto();
        result.setScore(score);
        result.setTotalQuestions(totalQuestions);
        result.setCorrectAnswers(correctAnswers);
        result.setPassingScore(assessment.getPassingScore());
        result.setPassed(passed);
        result.setAttemptNumber(attempt.getAttemptNumber());
        result.setMaxAttempts(maxAttempts);
        result.setAttemptsRemaining(passed ? 0 : Math.max(0, maxAttempts - attempt.getAttemptNumber()));
        result.setQuestions(review);

        return result;
    }

    /** Tentativas de todas as avaliacoes de um curso, para o instrutor e o gestor. */
    @Transactional(readOnly = true)
    public List<AssessmentAttemptDto> getCourseResults(UUID courseId) {
        return attemptRepository.findByAssessmentLessonModuleCourseIdOrderByCreatedAtDesc(courseId).stream()
                .map(this::mapAttemptToDto)
                .collect(Collectors.toList());
    }

    private AssessmentAttemptDto mapAttemptToDto(AssessmentAttempt attempt) {
        AssessmentAttemptDto dto = new AssessmentAttemptDto();
        dto.setId(attempt.getId());
        dto.setAttemptNumber(attempt.getAttemptNumber());
        dto.setScore(attempt.getScore());
        dto.setPassed(Boolean.TRUE.equals(attempt.getPassed()));
        dto.setCreatedAt(attempt.getCreatedAt());

        Assessment assessment = attempt.getAssessment();
        if (assessment != null) {
            dto.setPassingScore(assessment.getPassingScore());
            if (assessment.getLesson() != null) {
                dto.setLessonId(assessment.getLesson().getId());
                dto.setLessonTitle(assessment.getLesson().getTitle());
            }
        }

        if (attempt.getEnrollment() != null && attempt.getEnrollment().getUser() != null) {
            dto.setStudentId(attempt.getEnrollment().getUser().getId());
            dto.setStudentName(attempt.getEnrollment().getUser().getName());
        }

        return dto;
    }

    private AssessmentDto mapToDto(Assessment assessment) {
        AssessmentDto dto = new AssessmentDto();
        dto.setId(assessment.getId());
        dto.setTitle(assessment.getTitle());
        dto.setPassingScore(assessment.getPassingScore());
        dto.setMaxAttempts(assessment.getMaxAttempts());
        dto.setAttemptsRemaining(assessment.getMaxAttempts() == null ? 3 : assessment.getMaxAttempts());

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
