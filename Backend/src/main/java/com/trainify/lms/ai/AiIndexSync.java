package com.trainify.lms.ai;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Prepara para a IA as aulas que ainda nao tem trechos: as que ja existiam
 * antes desta versao e alguma que tenha falhado ao salvar. Roda em lotes
 * pequenos para nao pesar na instancia.
 */
@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(name = "app.ai.sync.enabled", havingValue = "true", matchIfMissing = true)
public class AiIndexSync {

    static final int AULAS_POR_RODADA = 20;

    private final LessonIndexingService indexing;

    @Scheduled(initialDelayString = "${app.ai.sync.initial-delay-ms:60000}",
            fixedDelayString = "${app.ai.sync.interval-ms:300000}")
    public void sincronizar() {
        try {
            int preparadas = indexing.indexarPendentes(AULAS_POR_RODADA);
            if (preparadas > 0) {
                log.info("IA: {} aula(s) pendente(s) preparada(s)", preparadas);
            }
        } catch (Exception e) {
            log.warn("IA: falha ao preparar aulas pendentes: {}", e.getMessage());
        }
    }
}
