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
    private final com.trainify.lms.repositories.TenantRepository tenantRepository;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;
    private final JavaMailSender mailSender;

    @Value("${app.frontend-url:http://localhost:3000}")
    private String frontendUrl;

    @Value("${spring.mail.username:no-reply@trainify.local}")
    private String mailFrom;

    private final SecureRandom secureRandom = new SecureRandom();

    public LoginResponse register(com.trainify.lms.dto.RegisterRequest request) {
        String email = normalizeEmail(request.getEmail());
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new RuntimeException("Email already exists");
        }

        com.trainify.lms.domain.entities.Tenant tenant = tenantRepository.findAll().stream().findFirst()
                .orElseThrow(() -> new RuntimeException("No tenant found"));

        com.trainify.lms.domain.entities.User user = new com.trainify.lms.domain.entities.User();
        user.setTenant(tenant);
        user.setName(request.getName());
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setRole(com.trainify.lms.domain.enums.Role.STUDENT);
        user.setIsActive(true);
        userRepository.save(user);

        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setEmail(email);
        loginRequest.setPassword(request.getPassword());
        return login(loginRequest);
    }

    public LoginResponse login(LoginRequest request) {
        String email = normalizeEmail(request.getEmail());
        log.info("AUTH_LOGIN_START emailDomain={}", email.substring(email.indexOf('@') + 1));

        final Authentication authentication;
        try {
            authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email, request.getPassword())
            );
        } catch (AuthenticationException ex) {
            log.info("AUTH_LOGIN_FAILED reason=INVALID_CREDENTIALS emailDomain={}",
                    email.substring(email.indexOf('@') + 1));
            throw ex;
        }

        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        log.info("AUTH_PASSWORD_VALIDATION result=success");
        String accessToken = jwtUtil.generateToken(userDetails);
        String refreshToken = jwtUtil.generateRefreshToken(userDetails);
        log.info("AUTH_TOKEN_GENERATION result=success");

        return new LoginResponse(accessToken, refreshToken);
    }

    @Transactional
    public void requestPasswordReset(ForgotPasswordRequest request) {
        String email = normalizeEmail(request.getEmail());
        var user = userRepository.findByEmailIgnoreCaseAndIsActiveTrue(email).orElse(null);
        if (user == null) {
            log.info("AUTH_PASSWORD_RESET_REQUEST result=accepted emailDomain={}", emailDomain(email));
            return;
        }

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
        log.info("AUTH_PASSWORD_RESET_REQUEST result=sent emailDomain={}", emailDomain(email));
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
        CustomUserDetails userDetails = (CustomUserDetails) userDetailsService.loadUserByUsername(username);

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
