package com.trainify.lms.ai;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import lombok.RequiredArgsConstructor;

/** "Criar curso com IA": enviar documentos, acompanhar, revisar e aprovar. */
@RestController
@RequestMapping("/api/v1/ai/course-drafts")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'INSTRUCTOR')")
public class CourseDraftController {

    private final CourseGenerationService service;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<CourseGenerationService.DraftDto> iniciar(
            @RequestPart("files") List<MultipartFile> files,
            @RequestParam(required = false) String instructions,
            @RequestParam(defaultValue = "2") int minModules,
            @RequestParam(defaultValue = "5") int maxModules) {

        return ResponseEntity.status(HttpStatus.ACCEPTED).body(service.iniciar(files, instructions, minModules, maxModules));
    }

    @GetMapping("/{id}")
    public ResponseEntity<CourseGenerationService.DraftDto> obter(@PathVariable UUID id) {
        return ResponseEntity.ok(service.obter(id));
    }

    @PutMapping("/{id}/proposal")
    public ResponseEntity<CourseGenerationService.DraftDto> salvarProposta(
            @PathVariable UUID id, @RequestBody Map<String, Object> proposal) {
        return ResponseEntity.ok(service.salvarProposta(id, proposal));
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<CourseGenerationService.DraftDto> aprovar(@PathVariable UUID id) {
        return ResponseEntity.ok(service.aprovar(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> descartar(@PathVariable UUID id) {
        service.descartar(id);
        return ResponseEntity.noContent().build();
    }
}
