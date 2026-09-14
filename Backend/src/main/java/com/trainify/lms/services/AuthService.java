package com.trainify.lms.services;

import java.util.Date;
import java.util.Locale;
import java.util.concurrent.TimeUnit;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Service;

import com.trainify.lms.dto.LoginRequest;
import com.trainify.lms.dto.LoginResponse;
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

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
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
