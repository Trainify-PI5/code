package com.trainify.lms.controllers;

import com.trainify.lms.security.*;
import com.trainify.lms.services.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest({InvitationController.class, AuthController.class})
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
class InvitationControllerTest {
    @Autowired MockMvc mvc;
    @MockBean InvitationService service;
    @MockBean AuthService auth;
    @MockBean JwtUtil jwtUtil;
    @MockBean CustomUserDetailsService users;
    @MockBean StringRedisTemplate redis;

    private String company() {
        return """
                {"requestId":"ea366000-7488-49d2-8d6f-44f77fcbbfb2","name":"Cliente",
                 "adminName":"Pessoa","adminEmail":"pessoa@example.com"}
                """;
    }

    @Test void publicRegistrationIsClosed() throws Exception {
        mvc.perform(post("/api/v1/auth/register").contentType("application/json")
                .content("{\"name\":\"Pessoa\",\"email\":\"pessoa@example.com\",\"password\":\"password123\"}"))
                .andExpect(status().isForbidden());
        verifyNoInteractions(auth);
    }

    @Test void anonymousCannotCreateCompany() throws Exception {
        mvc.perform(post("/api/v1/tenants").contentType("application/json").content(company()))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(service);
    }

    @Test @WithMockUser(roles = "ADMIN") void adminCannotCreateCompany() throws Exception {
        mvc.perform(post("/api/v1/tenants").contentType("application/json").content(company()))
                .andExpect(status().isForbidden());
        verifyNoInteractions(service);
    }

    @Test @WithMockUser(roles = "SUPER_ADMIN") void supremeCanCreateCompany() throws Exception {
        mvc.perform(post("/api/v1/tenants").contentType("application/json").content(company()))
                .andExpect(status().isCreated());
        verify(service).provision(any(), any());
    }

    @Test void acceptRequiresValidTokenAndPassword() throws Exception {
        mvc.perform(post("/api/v1/auth/invitations/accept").contentType("application/json")
                .content("{\"token\":\"invalid\",\"password\":\"short\"}"))
                .andExpect(status().isUnprocessableEntity());
        verifyNoInteractions(service);
    }

    @Test @WithMockUser(roles = "SUPER_ADMIN") void identifiesEmailFailureWithoutExposingProviderDetails() throws Exception {
        when(service.provision(any(), any())).thenThrow(new org.springframework.mail.MailSendException("private provider details"));
        mvc.perform(post("/api/v1/tenants").contentType("application/json").content(company()))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("EMAIL_DELIVERY_UNAVAILABLE"))
                .andExpect(jsonPath("$.detail").value("Não foi possível enviar o e-mail. A equipe responsável precisa verificar o serviço de envio."));
    }

    @Test void anonymousCanAcceptValidInvitation() throws Exception {
        mvc.perform(post("/api/v1/auth/invitations/accept").contentType("application/json")
                .content("{\"token\":\"" + "a".repeat(64) + "\",\"password\":\"password123\"}"))
                .andExpect(status().isNoContent());
        verify(service).accept(any());
    }

    @Test @WithMockUser(roles = "STUDENT") void studentCannotManageInvitations() throws Exception {
        mvc.perform(get("/api/v1/tenants/ea366000-7488-49d2-8d6f-44f77fcbbfb2/invitations"))
                .andExpect(status().isForbidden());
        verifyNoInteractions(service);
    }
}
