package com.trainify.lms.security.recaptcha;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.extern.slf4j.Slf4j;

/**
 * Confere com o Google o token que o reCAPTCHA gera no navegador, barrando
 * robos antes de chegar ao login.
 *
 * Fica desligado por padrao (app.recaptcha.enabled=false): sem a chave secreta
 * configurada, {@link #verify} nao faz nada e o login segue como sempre. Assim
 * ninguem precisa de conta no Google para rodar o projeto localmente ou abrir
 * um teste; a protecao so entra onde a chave estiver definida.
 *
 * Serve tanto ao v2 (checkbox "nao sou um robo") quanto ao v3 (invisivel, por
 * score): a resposta do Google traz "score" apenas no v3, e o limiar so e
 * cobrado quando configurado e presente.
 */
@Service
@Slf4j
public class RecaptchaService {

    private final boolean enabled;
    private final String secretKey;
    private final double minScore;
    private final RestClient restClient;

    public RecaptchaService(
            @Value("${app.recaptcha.enabled:false}") boolean enabled,
            @Value("${app.recaptcha.secret-key:}") String secretKey,
            @Value("${app.recaptcha.min-score:0.5}") double minScore,
            @Value("${app.recaptcha.verify-url:https://www.google.com/recaptcha/api/siteverify}") String verifyUrl) {
        this.enabled = enabled && !secretKey.isBlank();
        this.secretKey = secretKey;
        this.minScore = minScore;
        this.restClient = RestClient.create(verifyUrl);

        if (enabled && secretKey.isBlank()) {
            log.warn("RECAPTCHA_MISCONFIGURED app.recaptcha.enabled=true mas a chave secreta esta vazia; a verificacao fica desligada");
        }
    }

    /**
     * Valida o token da acao atual. Nao faz nada quando a protecao esta desligada.
     *
     * @param token    o g-recaptcha-response vindo do navegador
     * @param remoteIp IP de quem chamou (opcional; o Google usa como sinal extra)
     * @throws RecaptchaException quando o token falta, nao e aceito, ou o score
     *                            fica abaixo do limiar
     */
    public void verify(String token, String remoteIp) {
        if (!enabled) {
            return;
        }

        if (token == null || token.isBlank()) {
            throw new RecaptchaException("Confirme que você não é um robô para continuar.");
        }

        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("secret", secretKey);
        form.add("response", token);
        if (remoteIp != null && !remoteIp.isBlank()) {
            form.add("remoteip", remoteIp);
        }

        SiteVerifyResponse resposta;
        try {
            resposta = restClient.post()
                    .contentType(org.springframework.http.MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .body(SiteVerifyResponse.class);
        } catch (Exception e) {
            // Indisponibilidade do Google nao pode derrubar o login: registra e libera.
            log.error("RECAPTCHA_VERIFY_UNREACHABLE motivo={}", e.getMessage());
            return;
        }

        if (resposta == null || !resposta.success()) {
            List<String> erros = resposta == null ? List.of() : resposta.errorCodes();
            log.warn("RECAPTCHA_REJECTED erros={}", erros);
            throw new RecaptchaException("Falha na verificação anti-robô. Tente novamente.");
        }

        // Score so existe no v3; no v2 vem nulo e nao ha limiar a cobrar.
        if (resposta.score() != null && resposta.score() < minScore) {
            log.warn("RECAPTCHA_LOW_SCORE score={} limiar={}", resposta.score(), minScore);
            throw new RecaptchaException("Falha na verificação anti-robô. Tente novamente.");
        }

        log.info("RECAPTCHA_OK score={}", resposta.score());
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record SiteVerifyResponse(
            boolean success,
            Double score,
            String action,
            String hostname,
            @JsonProperty("error-codes") List<String> errorCodes) {

        @Override
        public List<String> errorCodes() {
            return errorCodes == null ? List.of() : errorCodes;
        }
    }
}
