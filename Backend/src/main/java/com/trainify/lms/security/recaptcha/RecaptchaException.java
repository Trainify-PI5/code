package com.trainify.lms.security.recaptcha;

/**
 * A verificacao do reCAPTCHA falhou: token ausente, invalido, expirado ou
 * reprovado pelo Google. O {@code GlobalExceptionHandler} a traduz para 400.
 */
public class RecaptchaException extends RuntimeException {
    public RecaptchaException(String message) {
        super(message);
    }
}
