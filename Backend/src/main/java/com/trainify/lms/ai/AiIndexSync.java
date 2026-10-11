package com.trainify.lms.ai;

import java.util.HashSet;
import java.util.Set;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.trainify.lms.domain.entities.Course;
import com.trainify.lms.domain.enums.CourseStatus;
import com.trainify.lms.repositories.CourseRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Confere de tempos em tempos se todos os cursos estao no indice da IA e
 * reindexa os que faltarem. Na hospedagem gratuita o disco do servico de IA e
 * apagado quando ele reinicia; sem isto o assistente passaria a responder que
 * nao encontrou nada no material.
 */
@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(name = "app.ai.sync.enabled", havingValue = "true", matchIfMissing = true)
public class AiIndexSync {

    private final TrainifyAiClient ai;
    private final CourseRepository courseRepository;
    private final LessonIndexingService indexing;

    @Scheduled(initialDelayString = "${app.ai.sync.initial-delay-ms:60000}",
            fixedDelayString = "${app.ai.sync.interval-ms:600000}")
    public void sincronizar() {
        Set<String> indexados;
        try {
            indexados = new HashSet<>(ai.indexedCourses().courseIds());
        } catch (Exception e) {
            // Servico fora do ar ou acordando: tenta de novo na proxima rodada
            log.debug("Servico de IA indisponivel para sincronizar: {}", e.getMessage());
            return;
        }

        int reindexados = 0;
        for (Course course : courseRepository.findAll()) {
            if (course.getStatus() == CourseStatus.ARCHIVED || indexados.contains(course.getId().toString())) {
                continue;
            }
            try {
                if (indexing.reindexarCurso(course.getId()) > 0) {
                    reindexados++;
                }
            } catch (Exception e) {
                log.warn("Falha ao reindexar o curso {} na IA: {}", course.getId(), e.getMessage());
            }
        }
        if (reindexados > 0) {
            log.info("Sincronizacao com a IA: {} curso(s) reindexado(s)", reindexados);
        }
    }
}
