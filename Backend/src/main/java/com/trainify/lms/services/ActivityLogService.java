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

    /** Acao sem usuario logado ainda, como o proprio login e o aceite de convite. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordFor(User user, String actionType, String entityType, UUID entityId,
                          Map<String, Object> details) {
        if (user == null || user.getTenant() == null) {
            return;
        }
        gravar(user.getTenant().getId(), user.getId(), actionType, entityType, entityId, details);
    }

    private void gravar(UUID tenantId, UUID userId, String actionType, String entityType, UUID entityId,
                        Map<String, Object> details) {
        try {
            ActivityLog log = new ActivityLog();
            log.setTenantId(tenantId);

            if (userId != null) {
                User referencia = new User();
                referencia.setId(userId);
                log.setUser(referencia);
            }

            log.setActionType(actionType);
            log.setEntityType(entityType);
            log.setEntityId(entityId);
            log.setDetails(details == null ? Map.of() : details);

            repository.save(log);
        } catch (Exception e) {
            // Auditoria e importante, mas nunca mais do que a acao do usuario
            log.warn("Falha ao registrar auditoria {}: {}", actionType, e.getMessage());
        }
    }
}
