package com.trainify.lms.controllers;

import com.trainify.lms.dto.LoginRequest;
import com.trainify.lms.dto.LoginResponse;
import com.trainify.lms.dto.RefreshTokenRequest;
import com.trainify.lms.dto.ForgotPasswordRequest;
import com.trainify.lms.dto.ResetPasswordRequest;
import com.trainify.lms.security.recaptcha.RecaptchaService;
import com.trainify.lms.services.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final RecaptchaService recaptchaService;

    @PostMapping("/register")
    public ResponseEntity<LoginResponse> register(@Valid @RequestBody com.trainify.lms.dto.RegisterRequest request) {
        throw new org.springframework.security.access.AccessDeniedException("O cadastro é realizado por convite da sua empresa.");
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request,
                                               HttpServletRequest httpRequest) {
        // Barra robos antes de tentar autenticar. Fica inerte quando o reCAPTCHA
        // esta desligado (app.recaptcha.enabled=false).
        recaptchaService.verify(request.getRecaptchaToken(), clientIp(httpRequest));
        return ResponseEntity.ok(authService.login(request));
    }

    /**
     * IP real de quem chamou. Atras do proxy do Render a conexao vem do proxy,
     * entao o endereco de origem fica no primeiro item do X-Forwarded-For.
     */
    private String clientIp(HttpServletRequest request) {
        String encaminhado = request.getHeader("X-Forwarded-For");
        if (encaminhado != null && !encaminhado.isBlank()) {
            return encaminhado.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Void> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.requestPasswordReset(request);
        return ResponseEntity.accepted().build();
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Void> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/refresh")
    public ResponseEntity<LoginResponse> refresh(@Valid @RequestBody RefreshTokenRequest request) {
        return ResponseEntity.ok(authService.refresh(request.getRefreshToken()));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@org.springframework.web.bind.annotation.RequestHeader(value = "Authorization", required = false) String token) {
        if (token != null && token.startsWith("Bearer ")) {
            authService.logout(token.substring(7));
        }
        return ResponseEntity.noContent().build();
    }
}
