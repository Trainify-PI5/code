package com.trainify.lms.repositories;

import com.trainify.lms.domain.entities.CompanyInvitation;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CompanyInvitationRepository extends JpaRepository<CompanyInvitation, UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from CompanyInvitation i where i.tokenHash = :hash")
    Optional<CompanyInvitation> findForAcceptance(@Param("hash") String hash);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from CompanyInvitation i where i.id = :id and i.tenant.id = :tenantId")
    Optional<CompanyInvitation> findForManagement(@Param("id") UUID id, @Param("tenantId") UUID tenantId);

    List<CompanyInvitation> findByTenantIdOrderByCreatedAtDesc(UUID tenantId);
    boolean existsByEmailIgnoreCaseAndTenantIdAndAcceptedAtIsNullAndRevokedAtIsNull(String email, java.util.UUID tenantId);
}
