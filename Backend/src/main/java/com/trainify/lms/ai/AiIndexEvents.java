package com.trainify.lms.ai;

import java.util.UUID;

/**
 * Eventos publicados pelo cadastro de cursos para manter o indice da IA em dia.
 * Sao tratados depois do commit e fora da requisicao: salvar uma aula nunca
 * espera nem falha por causa da IA.
 */
public final class AiIndexEvents {

    private AiIndexEvents() {
    }

    /** Aula criada, editada ou com transcricao nova: precisa ser (re)indexada. */
    public record LessonChanged(UUID lessonId) {}

    /** Aula excluida: sai do indice do curso. */
    public record LessonRemoved(UUID courseId, UUID lessonId) {}

    /** Curso excluido: o indice dele inteiro e apagado. */
    public record CourseRemoved(UUID courseId) {}
}
