package com.trainify.lms.repositories;

import com.trainify.lms.domain.entities.ActivityLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ActivityLogRepository extends JpaRepository<ActivityLog, UUID> {

    /**
     * O usuario vem junto de proposito: a tela mostra o nome dele e, carregado
     * sob demanda, a leitura acontecia depois da transacao fechar.
     */
    @EntityGraph(attributePaths = "user")
    Page<ActivityLog> findByTenantIdOrderByCreatedAtDesc(UUID tenantId, Pageable pageable);
}
