package com.trainify.lms.services;

import com.trainify.lms.dto.LoginRequest;
import com.trainify.lms.dto.LoginResponse;
import com.trainify.lms.security.CustomUserDetails;
import com.trainify.lms.security.JwtUtil;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetailsService;

import java.util.Date;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AuthServiceTest {

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private JwtUtil jwtUtil;

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private UserDetailsService userDetailsService;

    @Mock
    private ValueOperations<String, String> valueOperations;

    @InjectMocks
    private AuthService authService;

    @Test
    void login_Success_ReturnsLoginResponse() {
        // Arrange
        LoginRequest request = new LoginRequest();
        request.setEmail("test@test.com");
        request.setPassword("password");
        Authentication authentication = mock(Authentication.class);
        CustomUserDetails userDetails = mock(CustomUserDetails.class);

        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class))).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(userDetails);
        when(jwtUtil.generateToken(userDetails)).thenReturn("access-token");
        when(jwtUtil.generateRefreshToken(userDetails)).thenReturn("refresh-token");

        // Act
        LoginResponse response = authService.login(request);

        // Assert
        assertNotNull(response);
        assertEquals("access-token", response.getAccessToken());
        assertEquals("refresh-token", response.getRefreshToken());

        verify(authenticationManager).authenticate(any(UsernamePasswordAuthenticationToken.class));
        verify(jwtUtil).generateToken(userDetails);
        verify(jwtUtil).generateRefreshToken(userDetails);
    }

    @Test
    void refresh_Success_ReturnsNewTokensAndBlacklistsOldToken() {
        // Arrange
        String oldRefreshToken = "old-refresh-token";
        String jti = UUID.randomUUID().toString();
        String username = "test@test.com";
        CustomUserDetails userDetails = mock(CustomUserDetails.class);
        Date expirationDate = new Date(System.currentTimeMillis() + 100000);

        when(jwtUtil.extractJti(oldRefreshToken)).thenReturn(jti);
        when(redisTemplate.hasKey("blacklist:" + jti)).thenReturn(false);
        when(jwtUtil.extractUsername(oldRefreshToken)).thenReturn(username);
        when(userDetailsService.loadUserByUsername(username)).thenReturn(userDetails);
        when(jwtUtil.validateToken(oldRefreshToken, userDetails)).thenReturn(true);
        when(jwtUtil.extractExpiration(oldRefreshToken)).thenReturn(expirationDate);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(jwtUtil.generateToken(userDetails)).thenReturn("new-access-token");
        when(jwtUtil.generateRefreshToken(userDetails)).thenReturn("new-refresh-token");

        // Act
        LoginResponse response = authService.refresh(oldRefreshToken);

        // Assert
        assertNotNull(response);
        assertEquals("new-access-token", response.getAccessToken());
        assertEquals("new-refresh-token", response.getRefreshToken());

        verify(redisTemplate).hasKey("blacklist:" + jti);
        verify(redisTemplate.opsForValue()).set(eq("blacklist:" + jti), eq("true"), anyLong(), eq(TimeUnit.MILLISECONDS));
        verify(jwtUtil).generateToken(userDetails);
        verify(jwtUtil).generateRefreshToken(userDetails);
    }

    @Test
    void refresh_TokenInBlacklist_ThrowsException() {
        // Arrange
        String oldRefreshToken = "old-refresh-token";
        String jti = UUID.randomUUID().toString();

        when(jwtUtil.extractJti(oldRefreshToken)).thenReturn(jti);
        when(redisTemplate.hasKey("blacklist:" + jti)).thenReturn(true);

        // Act & Assert
        RuntimeException exception = assertThrows(RuntimeException.class, () -> authService.refresh(oldRefreshToken));
        assertEquals("Refresh token is blacklisted", exception.getMessage());

        verify(redisTemplate).hasKey("blacklist:" + jti);
        verifyNoMoreInteractions(jwtUtil, userDetailsService);
    }

    @Test
    void refresh_InvalidToken_ThrowsException() {
        // Arrange
        String oldRefreshToken = "old-refresh-token";
        String jti = UUID.randomUUID().toString();
        String username = "test@test.com";
        CustomUserDetails userDetails = mock(CustomUserDetails.class);

        when(jwtUtil.extractJti(oldRefreshToken)).thenReturn(jti);
        when(redisTemplate.hasKey("blacklist:" + jti)).thenReturn(false);
        when(jwtUtil.extractUsername(oldRefreshToken)).thenReturn(username);
        when(userDetailsService.loadUserByUsername(username)).thenReturn(userDetails);
        when(jwtUtil.validateToken(oldRefreshToken, userDetails)).thenReturn(false);

        // Act & Assert
        RuntimeException exception = assertThrows(RuntimeException.class, () -> authService.refresh(oldRefreshToken));
        assertEquals("Invalid refresh token", exception.getMessage());

        verify(jwtUtil).validateToken(oldRefreshToken, userDetails);
        verify(redisTemplate, never()).opsForValue();
    }
}
