package com.trainify.lms.dto;

import java.time.Instant;
import java.util.UUID;

import com.trainify.lms.domain.entities.ActivityLog;

/**
 * Linha da tela de Auditoria.
 *
 * A rota devolvia a entidade crua, e a referencia ao usuario e carregada sob
 * demanda: na hora de virar JSON, fora da transacao, a serializacao quebrava.
 * Enquanto a tabela estava vazia ninguem percebia.
 */
public record AuditLogDto(
        UUID id,
        Instant createdAt,
        Usuario user,
        String actionType,
        String entityType,
        UUID entityId,
        String ipAddress
) {

    /** So o necessario para a coluna "Usuario"; o resto da conta nao interessa aqui. */
    public record Usuario(UUID id, String name) {}

    public static AuditLogDto from(ActivityLog log) {
        Usuario usuario = log.getUser() == null
                ? null
                : new Usuario(log.getUser().getId(), log.getUser().getName());

        return new AuditLogDto(
                log.getId(),
                log.getCreatedAt(),
                usuario,
                log.getActionType(),
                log.getEntityType(),
                log.getEntityId(),
                log.getIpAddress());
    }
}
