package com.trainify.lms.ai;

import java.util.concurrent.TimeUnit;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;

import feign.Request;
import feign.RequestInterceptor;

/**
 * Configuracao exclusiva do cliente do trainify-ai. Sem @Configuration de
 * proposito: assim ela nao vaza para os outros clientes Feign do sistema.
 */
public class TrainifyAiClientConfig {

    @Bean
    RequestInterceptor chaveInternaDoServicoDeIa(@Value("${app.ai.internal-key:}") String chave) {
        return template -> {
            if (!chave.isBlank()) {
                template.header("X-Internal-Key", chave);
            }
        };
    }

    /** Gerar resposta ou quiz leva alguns segundos; indexar um PDF grande, mais. */
    @Bean
    Request.Options tempoLimiteDoServicoDeIa(@Value("${app.ai.read-timeout-seconds:120}") long leitura) {
        return new Request.Options(5, TimeUnit.SECONDS, leitura, TimeUnit.SECONDS, true);
    }
}
