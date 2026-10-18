package com.trainify.lms.security;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Os testes de controller chamam o metodo Java direto, entao a camada HTTP
 * — seguranca e traducao de erros — nunca era exercitada. Estes passam pela
 * cadeia de filtros de verdade.
 *
 * O 401 importa alem da seguranca: o site so tenta renovar a sessao quando
 * recebe 401. Se uma rota protegida passar a responder 403 para token ausente,
 * a pessoa e deslogada em vez de continuar.
 */
@SpringBootTest
@AutoConfigureMockMvc
class ProtecaoDasRotasTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void rotaProtegidaSemTokenResponde401() throws Exception {
        mockMvc.perform(get("/api/v1/users/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void tokenIlegivelTambemResponde401ENaoDerrubaAApi() throws Exception {
        mockMvc.perform(get("/api/v1/users/me")
                        .header("Authorization", "Bearer isto-nao-e-um-token"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void aAuditoriaNaoFicaAbertaParaQuemNaoEstaAutenticado() throws Exception {
        mockMvc.perform(get("/api/v1/audit-logs"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void oHealthFicaAbertoParaORoboQueMantemAApiAcordada() throws Exception {
        mockMvc.perform(get("/api/v1/health"))
                .andExpect(status().isOk());
    }

    @Test
    void corpoIlegivelNoLoginE400ComExplicacao() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{isto nao e json"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").exists());
    }

    @Test
    void metodoErradoContinuaSendo405ENao500() throws Exception {
        mockMvc.perform(delete("/api/v1/auth/login"))
                .andExpect(status().isMethodNotAllowed());
    }
}
