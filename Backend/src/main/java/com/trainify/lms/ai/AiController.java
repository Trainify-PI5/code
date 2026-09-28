package com.trainify.lms.ai;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.trainify.lms.dto.CreateAssessmentRequest;

import lombok.Data;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiService aiService;

    /** Permite ao frontend esconder os botoes quando a IA nao esta configurada. */
    @GetMapping("/status")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Boolean>> status() {
        return ResponseEntity.ok(Map.of("enabled", aiService.isEnabled()));
    }

    /** Sugestao de quiz a partir da aula. Nada e salvo: o instrutor revisa antes. */
    @PostMapping("/lessons/{lessonId}/quiz")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'INSTRUCTOR')")
    public ResponseEntity<CreateAssessmentRequest> suggestQuiz(
            @PathVariable UUID lessonId,
            @RequestParam(defaultValue = "3") int questions) {

        int quantidade = Math.min(Math.max(questions, 1), 10);
        return ResponseEntity.ok(aiService.suggestQuiz(lessonId, quantidade));
    }

    @PostMapping("/lessons/{lessonId}/summary")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'INSTRUCTOR')")
    public ResponseEntity<AiSummaryDto> summarize(@PathVariable UUID lessonId) {
        return ResponseEntity.ok(aiService.summarize(lessonId));
    }

    @PostMapping("/tutor")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, String>> tutor(@RequestBody TutorRequest request) {
        return ResponseEntity.ok(Map.of("response", aiService.tutor(request.getLessonId(), request.getQuestion())));
    }

    /** Explica as questoes que o aluno errou na avaliacao da aula. */
    @PostMapping("/lessons/{lessonId}/explain")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<AiExplanationDto>> explain(
            @PathVariable UUID lessonId,
            @RequestBody ExplainRequest request) {

        return ResponseEntity.ok(aiService.explainMistakes(lessonId, request.getQuestionIds()));
    }

    @Data
    public static class TutorRequest {
        private UUID lessonId;
        private String question;
    }

    @Data
    public static class ExplainRequest {
        private List<UUID> questionIds;
    }
}
