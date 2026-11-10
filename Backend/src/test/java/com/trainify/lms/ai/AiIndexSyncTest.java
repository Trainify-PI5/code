package com.trainify.lms.ai;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;

class AiIndexSyncTest {

    private final LessonIndexingService indexing = mock(LessonIndexingService.class);

    @Test
    void preparaAsAulasPendentesEmLotes() {
        new AiIndexSync(indexing).sincronizar();
        verify(indexing).indexarPendentes(AiIndexSync.AULAS_POR_RODADA);
    }

    /** Uma falha (banco fora, por exemplo) nao pode derrubar o agendador. */
    @Test
    void falhaFicaSoNoLog() {
        when(indexing.indexarPendentes(AiIndexSync.AULAS_POR_RODADA)).thenThrow(new IllegalStateException("banco fora"));
        new AiIndexSync(indexing).sincronizar();
    }
}
