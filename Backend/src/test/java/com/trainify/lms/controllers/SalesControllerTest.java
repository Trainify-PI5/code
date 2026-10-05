package com.trainify.lms.controllers;

import com.trainify.lms.security.*;
import com.trainify.lms.services.SalesRateLimiter;
import com.trainify.lms.services.SalesService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import java.util.List;
import java.util.UUID;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(SalesController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class, SalesRateLimiter.class})
class SalesControllerTest {
    @Autowired MockMvc mvc;
    @MockBean SalesService service;
    @MockBean JwtUtil jwtUtil;
    @MockBean CustomUserDetailsService users;
    @MockBean StringRedisTemplate redis;

    private String payload() {
        return """
                {"id":"ea366000-7488-49d2-8d6f-44f77fcbbfb2","firstName":"Ana","lastName":"Silva",
                 "email":"ana@example.com","phone":"+5511999999999","company":"Empresa","jobTitle":"Diretora",
                 "companySize":"11-50","message":"Demonstração","consent":true,"website":""}
                """;
    }

    @Test void publicSubmissionReturnsOnlyReceipt() throws Exception {
        when(service.create(any())).thenReturn(UUID.fromString("ea366000-7488-49d2-8d6f-44f77fcbbfb2"));
        mvc.perform(post("/api/v1/public/sales-requests").contentType("application/json").content(payload()))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.email").doesNotExist());
        verify(service).create(any());
    }

    @Test void rejectsMissingConsentAndInvalidContact() throws Exception {
        mvc.perform(post("/api/v1/public/sales-requests").contentType("application/json")
                .content(payload().replace("true", "false").replace("ana@example.com", "invalid")))
                .andExpect(status().isUnprocessableEntity());
        verifyNoInteractions(service);
    }

    @Test void rejectsWhitespaceAndHoneypot() throws Exception {
        mvc.perform(post("/api/v1/public/sales-requests").contentType("application/json")
                .content(payload().replace("\"Ana\"", "\"   \"").replace("\"website\":\"\"", "\"website\":\"spam\"")))
                .andExpect(status().isUnprocessableEntity());
        verifyNoInteractions(service);
    }

    @Test void anonymousCannotReadLeads() throws Exception {
        mvc.perform(get("/api/v1/sales-requests")).andExpect(status().isUnauthorized());
    }

    @Test @WithMockUser(roles = "ADMIN") void tenantAdminCannotReadOrChangeLeads() throws Exception {
        mvc.perform(get("/api/v1/sales-requests")).andExpect(status().isForbidden());
        mvc.perform(patch("/api/v1/sales-requests/ea366000-7488-49d2-8d6f-44f77fcbbfb2/status")
                .contentType("application/json").content("{\"status\":\"CONTACTED\"}"))
                .andExpect(status().isForbidden());
        verifyNoInteractions(service);
    }

    @Test @WithMockUser(roles = "SUPER_ADMIN") void teamCanReadAndUpdate() throws Exception {
        when(service.list(0)).thenReturn(new SalesService.Page(List.of(), 0, 0));
        mvc.perform(get("/api/v1/sales-requests")).andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"));
        mvc.perform(patch("/api/v1/sales-requests/ea366000-7488-49d2-8d6f-44f77fcbbfb2/status")
                .contentType("application/json").content("{\"status\":\"CONTACTED\"}"))
                .andExpect(status().isNoContent());
        verify(service).updateStatus(any(), eq(SalesService.Status.CONTACTED));
    }
}
