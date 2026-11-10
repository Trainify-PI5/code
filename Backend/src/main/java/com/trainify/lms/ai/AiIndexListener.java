package com.trainify.lms.ai;

import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Mantem os trechos usados pela IA iguais ao cadastro de cursos. Roda depois do
 * commit e em segundo plano: salvar uma aula nunca espera nem falha por causa
 * da IA.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AiIndexListener {

    private final LessonIndexingService indexing;
    private final TrechoRepository trechos;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void aoMudarAula(AiIndexEvents.LessonChanged evento) {
        executar("preparar a aula " + evento.lessonId(), () -> indexing.indexar(evento.lessonId()));
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void aoExcluirAula(AiIndexEvents.LessonRemoved evento) {
        // O banco ja apaga os trechos junto com a aula (ON DELETE CASCADE); isto
        // so garante a limpeza se a exclusao um dia passar a ser logica.
        executar("remover a aula " + evento.lessonId(), () -> trechos.removerAula(evento.lessonId()));
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void aoExcluirCurso(AiIndexEvents.CourseRemoved evento) {
        executar("remover o curso " + evento.courseId(), () -> trechos.removerCurso(evento.courseId()));
    }

    private static void executar(String descricao, Runnable acao) {
        try {
            acao.run();
        } catch (Exception e) {
            log.warn("IA: falha ao {}: {}", descricao, e.getMessage());
        }
    }
}
