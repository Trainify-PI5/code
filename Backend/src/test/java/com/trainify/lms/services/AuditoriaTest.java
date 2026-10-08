package com.trainify.lms.services;

import com.trainify.lms.domain.entities.ActivityLog;
import com.trainify.lms.domain.entities.User;
import com.trainify.lms.dto.AuditLogDto;
import com.trainify.lms.repositories.ActivityLogRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * A tela de Auditoria existia desde o inicio mostrando uma tabela que nunca
 * seria preenchida. Estes testes cobrem o que faltava para ela ser real.
 */
@ExtendWith(MockitoExtension.class)
class AuditoriaTest {

    private static final UUID EMPRESA = UUID.randomUUID();
    private static final UUID PESSOA = UUID.randomUUID();

    @Mock private ActivityLogRepository repository;
    @InjectMocks private ActivityLogService service;

    @AfterEach
    void limparRequisicao() {
        RequestContextHolder.resetRequestAttributes();
    }

    private ActivityLog capturarRegistro() {
        ArgumentCaptor<ActivityLog> captor = ArgumentCaptor.forClass(ActivityLog.class);
        verify(repository).saveAndFlush(captor.capture());
        return captor.getValue();
    }

    @Test
    void gravaOAcessoComAEmpresaEAPessoa() {
        service.recordFor(EMPRESA, PESSOA, "LOGIN", "USER", PESSOA, Map.of());

        ActivityLog registro = capturarRegistro();
        assertEquals(EMPRESA, registro.getTenantId());
        assertEquals(PESSOA, registro.getUser().getId());
        assertEquals("LOGIN", registro.getActionType());
    }

    @Test
    void semEmpresaNaoGravaNada() {
        service.recordFor(null, PESSOA, "LOGIN", "USER", PESSOA, Map.of());

        verify(repository, never()).saveAndFlush(any());
    }

    @Test
    void guardaOIpRealQueVemDoProxyDaHospedagem() {
        var requisicao = new MockHttpServletRequest();
        requisicao.setRemoteAddr("10.0.0.7"); // endereco interno do proxy
        requisicao.addHeader("X-Forwarded-For", "201.17.45.9, 172.71.3.1");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(requisicao));

        service.recordFor(EMPRESA, PESSOA, "LOGIN", "USER", PESSOA, Map.of());

        assertEquals("201.17.45.9", capturarRegistro().getIpAddress());
    }

    @Test
    void semRequisicaoEmCursoOIpFicaVazioEmVezDeQuebrar() {
        service.recordFor(EMPRESA, PESSOA, "COURSE_PUBLISHED", "COURSE", UUID.randomUUID(), Map.of());

        assertNull(capturarRegistro().getIpAddress());
    }

    @Test
    void falhaAoGravarNaoDerrubaAAcaoDoUsuario() {
        when(repository.saveAndFlush(any())).thenThrow(new RuntimeException("banco recusou"));

        assertDoesNotThrow(() -> service.recordFor(EMPRESA, PESSOA, "LOGIN", "USER", PESSOA, Map.of()));
    }

    @Test
    void aLinhaDaTelaLevaONomeDeQuemAgiuNaoAContaInteira() {
        User pessoa = new User();
        pessoa.setId(PESSOA);
        pessoa.setName("Ana Martins");
        pessoa.setPasswordHash("hash");

        ActivityLog registro = new ActivityLog();
        registro.setId(UUID.randomUUID());
        registro.setTenantId(EMPRESA);
        registro.setUser(pessoa);
        registro.setActionType("LOGIN");
        registro.setEntityType("USER");
        registro.setIpAddress("201.17.45.9");

        AuditLogDto linha = AuditLogDto.from(registro);

        assertEquals("Ana Martins", linha.user().name());
        assertEquals("LOGIN", linha.actionType());
        assertEquals("201.17.45.9", linha.ipAddress());
    }

    @Test
    void registroSemUsuarioVinculadoNaoQuebraATela() {
        ActivityLog registro = new ActivityLog();
        registro.setId(UUID.randomUUID());
        registro.setTenantId(EMPRESA);
        registro.setActionType("COURSE_PUBLISHED");

        assertNull(AuditLogDto.from(registro).user());
    }
}
