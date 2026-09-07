package com.trainify.lms.controllers;

import com.trainify.lms.dto.LoginRequest;
import com.trainify.lms.dto.LoginResponse;
import com.trainify.lms.dto.RefreshTokenRequest;
import com.trainify.lms.services.AuthService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class AuthControllerTest {

    @Mock
    private AuthService authService;

    @InjectMocks
    private AuthController authController;

    @Test
    void login_Success_ReturnsOkResponse() {
        // Arrange
        LoginRequest request = new LoginRequest();
        request.setEmail("test@test.com");
        request.setPassword("password");
        
        LoginResponse mockResponse = new LoginResponse("access-token", "refresh-token");
        when(authService.login(any(LoginRequest.class))).thenReturn(mockResponse);

        // Act
        ResponseEntity<LoginResponse> response = authController.login(request);

        // Assert
        assertNotNull(response);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("access-token", response.getBody().getAccessToken());
        verify(authService).login(request);
    }

    @Test
    void refresh_Success_ReturnsOkResponse() {
        // Arrange
        RefreshTokenRequest request = new RefreshTokenRequest();
        request.setRefreshToken("old-refresh-token");
        
        LoginResponse mockResponse = new LoginResponse("new-access-token", "new-refresh-token");
        when(authService.refresh("old-refresh-token")).thenReturn(mockResponse);

        // Act
        ResponseEntity<LoginResponse> response = authController.refresh(request);

        // Assert
        assertNotNull(response);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("new-access-token", response.getBody().getAccessToken());
        verify(authService).refresh("old-refresh-token");
    }
}
