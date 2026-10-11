package com.trainify.lms.ai;

import java.util.UUID;

import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Leva as mudancas do cadastro de cursos para o indice da IA. Roda depois do
 * commit e em segundo plano; se a IA estiver fora do ar, so fica registrado no
 * log e o curso pode ser reindexado depois.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AiIndexListener {

    private final LessonIndexingService indexing;
    private final TrainifyAiClient ai;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void aoMudarAula(AiIndexEvents.LessonChanged evento) {
        executar("indexar a aula " + evento.lessonId(), () -> indexing.indexar(evento.lessonId()));
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void aoExcluirAula(AiIndexEvents.LessonRemoved evento) {
        executar("remover a aula " + evento.lessonId(),
                () -> ai.removeLesson(evento.courseId().toString(), evento.lessonId().toString()));
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void aoExcluirCurso(AiIndexEvents.CourseRemoved evento) {
        executar("remover o curso " + evento.courseId(), () -> ai.removeCourse(evento.courseId().toString()));
    }

    @Async
    public void reindexarCurso(UUID courseId) {
        executar("reindexar o curso " + courseId, () -> {
            int aulas = indexing.reindexarCurso(courseId);
            log.info("Curso {} reindexado no servico de IA ({} aulas)", courseId, aulas);
        });
    }

    private static void executar(String descricao, Runnable acao) {
        try {
            acao.run();
        } catch (Exception e) {
            log.warn("Servico de IA: falha ao {}: {}", descricao, e.getMessage());
        }
    }
}
