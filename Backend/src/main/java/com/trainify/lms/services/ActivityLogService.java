package com.trainify.lms.services;

import java.util.Map;
import java.util.UUID;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.trainify.lms.domain.entities.ActivityLog;
import com.trainify.lms.domain.entities.User;
import com.trainify.lms.repositories.ActivityLogRepository;
import com.trainify.lms.security.CustomUserDetails;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Registro do que acontece na empresa. A tela de Auditoria existia desde o
 * inicio, mas nada era gravado: ficava vazia para sempre.
 *
 * Falhar ao registrar nunca pode derrubar a acao principal, entao tudo aqui e
 * defensivo e roda em transacao propria.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ActivityLogService {

    private final ActivityLogRepository repository;

    /** Acao de quem esta logado. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(String actionType, String entityType, UUID entityId, Map<String, Object> details) {
        var autenticacao = SecurityContextHolder.getContext().getAuthentication();
        if (autenticacao == null || !(autenticacao.getPrincipal() instanceof CustomUserDetails usuario)) {
            return;
        }
        gravar(usuario.getTenantId(), usuario.getId(), actionType, entityType, entityId, details);
    }

    /**
     * Acao de quem ainda nao esta logado, como o proprio login.
     *
     * Recebe os identificadores em vez da entidade: o usuario do login e lido em
     * outra transacao, ja encerrada quando a auditoria roda, e so de tocar na
     * empresa dele o Hibernate reclamava e derrubava a entrada.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordFor(UUID tenantId, UUID userId, String actionType, String entityType, UUID entityId,
                          Map<String, Object> details) {
        if (tenantId == null) {
            return;
        }
        gravar(tenantId, userId, actionType, entityType, entityId, details);
    }

    /**
     * A coluna de IP ja existia na tela de Auditoria, mas nada a preenchia: ela
     * sempre mostrava um endereco inventado. Atras do proxy da hospedagem o
     * endereco real vem no cabecalho de encaminhamento, nao na conexao.
     */
    private String ipDaRequisicao() {
        try {
            var atributos = (org.springframework.web.context.request.ServletRequestAttributes)
                    org.springframework.web.context.request.RequestContextHolder.getRequestAttributes();
            if (atributos == null) {
                return null;
            }

            var requisicao = atributos.getRequest();
            String encaminhado = requisicao.getHeader("X-Forwarded-For");
            String endereco = (encaminhado == null || encaminhado.isBlank())
                    ? requisicao.getRemoteAddr()
                    : encaminhado.split(",")[0].trim();

            if (endereco == null || endereco.isBlank()) {
                return null;
            }
            return endereco.length() > 45 ? endereco.substring(0, 45) : endereco;
        } catch (Exception e) {
            return null;
        }
    }

    private void gravar(UUID tenantId, UUID userId, String actionType, String entityType, UUID entityId,
                        Map<String, Object> details) {
        try {
            ActivityLog registro = new ActivityLog();
            registro.setTenantId(tenantId);

            if (userId != null) {
                User referencia = new User();
                referencia.setId(userId);
                registro.setUser(referencia);
            }

            registro.setActionType(actionType);
            registro.setEntityType(entityType);
            registro.setEntityId(entityId);
            registro.setDetails(details == null ? Map.of() : details);
            registro.setIpAddress(ipDaRequisicao());

            // saveAndFlush para o erro do banco estourar aqui dentro, e nao no commit,
            // quando ja estaria fora deste try e derrubaria a acao do usuario
            repository.saveAndFlush(registro);
        } catch (Exception e) {
            // Auditoria e importante, mas nunca mais do que a acao do usuario
            log.warn("Falha ao registrar auditoria {}: {}", actionType, e.getMessage());
        }
    }
}
