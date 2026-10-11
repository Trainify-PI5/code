package com.trainify.lms.services;

import java.util.Map;
import java.util.UUID;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import com.trainify.lms.domain.entities.ActivityLog;
import com.trainify.lms.domain.entities.User;
import com.trainify.lms.repositories.ActivityLogRepository;
import com.trainify.lms.security.CustomUserDetails;

import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Registro do que acontece na empresa. A tela de Auditoria existia desde o
 * inicio, mas nada era gravado: ficava vazia para sempre.
 *
 * Falhar ao registrar nunca pode derrubar a acao principal, entao tudo aqui e
 * defensivo e roda em transacao propria. A transacao e aberta DENTRO do try:
 * com @Transactional(REQUIRES_NEW) no metodo, um erro do banco marcava a
 * transacao para rollback e o commit estourava fora do try, desfazendo a acao
 * do usuario (publicar curso, criar usuario...).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ActivityLogService {

    private final ActivityLogRepository repository;
    private final EntityManager entityManager;
    private final PlatformTransactionManager transactionManager;

    /** Acao de quem esta logado. */
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
        String ip = ipDaRequisicao();
        try {
            TransactionTemplate transacao = new TransactionTemplate(transactionManager);
            transacao.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
            transacao.executeWithoutResult(status -> {
                ActivityLog registro = new ActivityLog();
                registro.setTenantId(tenantId);

                if (userId != null) {
                    // Referencia gerenciada pelo Hibernate. Um "new User()" so com o id
                    // ficava sem versao (@Version) e o Hibernate recusava o registro.
                    registro.setUser(entityManager.getReference(User.class, userId));
                }

                registro.setActionType(actionType);
                registro.setEntityType(entityType);
                registro.setEntityId(entityId);
                registro.setDetails(details == null ? Map.of() : details);
                registro.setIpAddress(ip);
                repository.saveAndFlush(registro);
            });
        } catch (Exception e) {
            // Auditoria e importante, mas nunca mais do que a acao do usuario
            log.warn("Falha ao registrar auditoria {}: {}", actionType, e.getMessage());
        }
    }
}
