package com.trainify.lms.ai;

import java.util.List;
import java.util.Map;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Microservico de IA (trainify-ai, em Python): RAG sobre o material dos cursos.
 * So o backend fala com ele; quem decide o que cada usuario pode consultar e o
 * Spring, que envia a lista de cursos permitidos em cada pergunta.
 */
@FeignClient(name = "trainify-ai", url = "${app.ai.service-url}", configuration = TrainifyAiClientConfig.class)
public interface TrainifyAiClient {

    @GetMapping("/health")
    Health health();

    @PostMapping("/api/chat")
    ChatResponse chat(@RequestBody ChatRequest request);

    @PostMapping("/api/quiz")
    QuizResponse quiz(@RequestBody QuizRequest request);

    @PostMapping("/api/ingest/lessons/{lessonId}")
    Map<String, Object> ingestLesson(@PathVariable("lessonId") String lessonId, @RequestBody IngestRequest request);

    @DeleteMapping("/api/ingest/courses/{courseId}/lessons/{lessonId}")
    Map<String, Object> removeLesson(@PathVariable("courseId") String courseId, @PathVariable("lessonId") String lessonId);

    @DeleteMapping("/api/ingest/courses/{courseId}")
    Map<String, Object> removeCourse(@PathVariable("courseId") String courseId);

    @GetMapping("/api/courses")
    IndexedCourses indexedCourses();

    @PostMapping("/api/course-drafts")
    CourseDraftStatus createCourseDraft(@RequestBody CourseDraftRequest request);

    @GetMapping("/api/course-drafts/{draftId}")
    CourseDraftStatus courseDraft(@PathVariable("draftId") String draftId);

    @DeleteMapping("/api/course-drafts/{draftId}")
    Map<String, Object> deleteCourseDraft(@PathVariable("draftId") String draftId);

    // ── contratos (mesmos nomes de campo do servico Python) ──

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Health(String status, @JsonProperty("llm_configured") boolean llmConfigured) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record IndexedCourses(@JsonProperty("course_ids") List<String> courseIds) {}

    @JsonInclude(JsonInclude.Include.NON_NULL)
    record DraftDocument(String name, @JsonProperty("pdf_base64") String pdfBase64, String text) {}

    @JsonInclude(JsonInclude.Include.NON_NULL)
    record CourseDraftRequest(
            @JsonProperty("draft_id") String draftId,
            List<DraftDocument> documents,
            @JsonProperty("min_modules") int minModules,
            @JsonProperty("max_modules") int maxModules,
            String instructions) {}

    /** Andamento da geracao. {@code result} so vem com status READY. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    record CourseDraftStatus(String status, Integer progress, String step, Map<String, Object> result, String error) {}

    record HistoryMessage(String role, String content) {}

    @JsonInclude(JsonInclude.Include.NON_NULL)
    record ChatRequest(
            String question,
            List<HistoryMessage> history,
            String role,
            @JsonProperty("course_ids") List<String> courseIds,
            @JsonProperty("lesson_id") String lessonId) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Source(
            @JsonProperty("course_id") String courseId,
            @JsonProperty("lesson_id") String lessonId,
            @JsonProperty("lesson_title") String lessonTitle,
            double score) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record ChatResponse(String answer, List<Source> sources) {}

    @JsonInclude(JsonInclude.Include.NON_NULL)
    record QuizRequest(
            @JsonProperty("course_id") String courseId,
            @JsonProperty("lesson_id") String lessonId,
            @JsonProperty("module_id") String moduleId,
            @JsonProperty("num_questions") int numQuestions,
            @JsonProperty("num_options") int numOptions,
            String topic) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record QuizOption(String text, boolean isCorrect) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record QuizQuestion(String text, String explanation, List<QuizOption> options) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record QuizResponse(String title, Integer passingScore, Integer maxAttempts, List<QuizQuestion> questions) {}

    @JsonInclude(JsonInclude.Include.NON_NULL)
    record IngestRequest(
            @JsonProperty("course_id") String courseId,
            String title,
            @JsonProperty("tenant_id") String tenantId,
            @JsonProperty("module_id") String moduleId,
            @JsonProperty("module_title") String moduleTitle,
            String content,
            String transcript,
            @JsonProperty("pdf_base64") String pdfBase64) {}
}
