package com.trainify.lms.ai;

import java.nio.charset.StandardCharsets;
import java.util.function.Supplier;

import com.fasterxml.jackson.databind.ObjectMapper;

import feign.FeignException;
import lombok.extern.slf4j.Slf4j;

/** Traduz as respostas de erro do servico de IA para as excecoes que a API ja conhece. */
@Slf4j
final class AiErrors {

    private static final ObjectMapper JSON = new ObjectMapper();

    private AiErrors() {
    }

    static <T> T chamar(Supplier<T> chamada) {
        try {
            return chamada.get();
        } catch (FeignException.UnprocessableEntity e) {
            // Ex.: modulo sem material indexado para gerar quiz, documento invalido
            throw new AiContentMissingException(detalhe(e, "Não há material suficiente para a IA."));
        } catch (FeignException.BadRequest e) {
            // Pedido malformado e defeito nosso, nao servico fora do ar. Vai como
            // IllegalArgumentException porque ela vira 400 com explicacao e esta
            // fora da contagem do disjuntor: um bug nosso nao pode derrubar o
            // assistente para todo mundo.
            log.warn("Servico de IA recusou o pedido: {}", e.contentUTF8());
            throw new IllegalArgumentException(detalhe(e, "O assistente não entendeu o pedido."));
        } catch (FeignException.TooManyRequests e) {
            throw new AiUnavailableException("Muitas perguntas em pouco tempo. Aguarde alguns segundos e tente de novo.");
        } catch (FeignException.Unauthorized e) {
            log.error("Servico de IA recusou a chave interna: confira app.ai.internal-key");
            throw new AiUnavailableException("O assistente está indisponível no momento.");
        } catch (FeignException e) {
            log.warn("Servico de IA respondeu {}: {}", e.status(), e.getMessage());
            throw new AiUnavailableException(e.status() == 502
                    ? detalhe(e, "A IA não conseguiu montar a resposta agora. Tente novamente.")
                    : "O assistente está indisponível no momento. Tente novamente em instantes.");
        }
    }

    static String detalhe(FeignException e, String padrao) {
        try {
            String corpo = e.contentUTF8();
            if (corpo == null || corpo.isBlank()) {
                return padrao;
            }
            var detail = JSON.readTree(corpo.getBytes(StandardCharsets.UTF_8)).path("detail");
            return detail.isTextual() && !detail.asText().isBlank() ? detail.asText() : padrao;
        } catch (Exception ignorado) {
            return padrao;
        }
    }
}
