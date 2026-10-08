package com.trainify.lms.services;

import java.util.Date;
import java.util.Locale;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.concurrent.TimeUnit;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.trainify.lms.dto.ForgotPasswordRequest;
import com.trainify.lms.dto.LoginRequest;
import com.trainify.lms.dto.LoginResponse;
import com.trainify.lms.dto.ResetPasswordRequest;
import com.trainify.lms.security.CustomUserDetails;
import com.trainify.lms.security.JwtUtil;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final StringRedisTemplate redisTemplate;
    private final UserDetailsService userDetailsService;
    private final com.trainify.lms.repositories.UserRepository userRepository;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;
    private final JavaMailSender mailSender;
    private final ActivityLogService activityLog;

    @Value("${app.frontend-url:http://localhost:3000}")
    private String frontendUrl;

    @Value("${spring.mail.username:no-reply@trainify.local}")
    private String mailFrom;

    private final SecureRandom secureRandom = new SecureRandom();

    public LoginResponse login(LoginRequest request) {
        String email = normalizeEmail(request.getEmail());
        log.info("AUTH_LOGIN_START emailDomain={}", email.substring(email.indexOf('@') + 1));

        // O mesmo e-mail pode ter conta em empresas diferentes
        java.util.UUID empresa = request.getTenantId();
        if (empresa == null) {
            var contas = userRepository.findAllByEmailIgnoreCaseAndIsActiveTrue(email);
            if (contas.size() > 1) {
                log.info("AUTH_LOGIN_TENANT_CHOICE contas={}", contas.size());
                throw new com.trainify.lms.exceptions.TenantSelectionRequiredException(
                        contas.stream()
                                .map(conta -> new com.trainify.lms.exceptions.TenantSelectionRequiredException.TenantOption(
                                        conta.getTenant().getId(), conta.getTenant().getName()))
                                .sorted(java.util.Comparator.comparing(
                                        com.trainify.lms.exceptions.TenantSelectionRequiredException.TenantOption::name))
                                .toList());
            }
            if (contas.size() == 1) {
                empresa = contas.get(0).getTenant().getId();
            }
        }

        final Authentication authentication;
        try {
            authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            com.trainify.lms.security.CustomUserDetailsService.usernameFor(email, empresa),
                            request.getPassword())
            );
        } catch (AuthenticationException ex) {
            log.info("AUTH_LOGIN_FAILED reason=INVALID_CREDENTIALS emailDomain={}",
                    email.substring(email.indexOf('@') + 1));
            throw ex;
        }

        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        log.info("AUTH_PASSWORD_VALIDATION result=success");

        userRepository.findById(userDetails.getId()).ifPresent(conta ->
                activityLog.recordFor(conta, "LOGIN", "USER", conta.getId(), java.util.Map.of()));
        String accessToken = jwtUtil.generateToken(userDetails);
        String refreshToken = jwtUtil.generateRefreshToken(userDetails);
        log.info("AUTH_TOKEN_GENERATION result=success");

        return new LoginResponse(accessToken, refreshToken);
    }

    @Transactional
    public void requestPasswordReset(ForgotPasswordRequest request) {
        String email = normalizeEmail(request.getEmail());
        var contas = userRepository.findAllByEmailIgnoreCaseAndIsActiveTrue(email);
        if (contas.isEmpty()) {
            log.info("AUTH_PASSWORD_RESET_REQUEST result=accepted emailDomain={}", emailDomain(email));
            return;
        }

        // Com conta em mais de uma empresa, cada uma recebe o proprio link
        for (var user : contas) {
        byte[] tokenBytes = new byte[32];
        secureRandom.nextBytes(tokenBytes);
        String token = java.util.HexFormat.of().formatHex(tokenBytes);
        user.setPasswordResetTokenHash(hashToken(token));
        user.setPasswordResetTokenExpiresAt(Instant.now().plusSeconds(30 * 60));
        userRepository.save(user);

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(mailFrom);
        message.setTo(user.getEmail());
        message.setSubject("Redefinição de senha Trainify");
        message.setText("Use este link para redefinir sua senha (válido por 30 minutos):\n"
                + frontendUrl + "/reset-password?token=" + token);
        mailSender.send(message);
        }
        log.info("AUTH_PASSWORD_RESET_REQUEST result=sent contas={} emailDomain={}", contas.size(), emailDomain(email));
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        String tokenHash = hashToken(request.getToken());
        var user = userRepository.findByPasswordResetTokenHashAndPasswordResetTokenExpiresAtAfterAndIsActiveTrue(
                tokenHash, Instant.now())
                .orElseThrow(() -> new IllegalArgumentException("Token de recuperação inválido ou expirado."));

        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setPasswordResetTokenHash(null);
        user.setPasswordResetTokenExpiresAt(null);
        userRepository.save(user);
        log.info("AUTH_PASSWORD_RESET result=success emailDomain={}", emailDomain(user.getEmail()));
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String emailDomain(String email) {
        int atIndex = email.indexOf('@');
        return atIndex >= 0 ? email.substring(atIndex + 1) : "invalid";
    }

    private String hashToken(String token) {
        try {
            return java.util.HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(token.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 indisponível", ex);
        }
    }

    public LoginResponse refresh(String refreshToken) {
        // Validar se o token está na lista de bloqueio (blacklist)
        String jti = jwtUtil.extractJti(refreshToken);
        if (Boolean.TRUE.equals(redisTemplate.hasKey("blacklist:" + jti))) {
            throw new RuntimeException("Refresh token is blacklisted");
        }

        String username = jwtUtil.extractUsername(refreshToken);
        String tenantDoToken = jwtUtil.extractTenantId(refreshToken);
        CustomUserDetails userDetails = (CustomUserDetails) userDetailsService.loadUserByUsername(
                com.trainify.lms.security.CustomUserDetailsService.usernameFor(
                        username, tenantDoToken == null ? null : java.util.UUID.fromString(tenantDoToken)));

        if (!jwtUtil.validateToken(refreshToken, userDetails)) {
            throw new RuntimeException("Invalid refresh token");
        }

        // Colocar o token de atualização antigo na lista de bloqueio
        Date expiration = jwtUtil.extractExpiration(refreshToken);
        long timeToLive = expiration.getTime() - System.currentTimeMillis();
        redisTemplate.opsForValue().set("blacklist:" + jti, "true", timeToLive, TimeUnit.MILLISECONDS);

        // Generate new tokens
        String newAccessToken = jwtUtil.generateToken(userDetails);
        String newRefreshToken = jwtUtil.generateRefreshToken(userDetails);

        return new LoginResponse(newAccessToken, newRefreshToken);
    }

    public void logout(String accessToken) {
        String jti = jwtUtil.extractJti(accessToken);
        Date expiration = jwtUtil.extractExpiration(accessToken);
        long timeToLive = expiration.getTime() - System.currentTimeMillis();
        if (timeToLive > 0) {
            redisTemplate.opsForValue().set("blacklist:" + jti, "true", timeToLive, TimeUnit.MILLISECONDS);
        }
    }
}
