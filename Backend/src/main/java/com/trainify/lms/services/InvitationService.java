package com.trainify.lms.services;

import com.trainify.lms.domain.entities.CompanyInvitation;
import com.trainify.lms.domain.entities.Tenant;
import com.trainify.lms.domain.entities.User;
import com.trainify.lms.domain.enums.Role;
import com.trainify.lms.dto.*;
import com.trainify.lms.repositories.*;
import com.trainify.lms.security.CustomUserDetails;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
public class InvitationService {
    private final CompanyInvitationRepository invitations;
    private final TenantRepository tenants;
    private final UserRepository users;
    private final PasswordEncoder passwords;
    private final JavaMailSender mail;
    private final SecureRandom random = new SecureRandom();

    @Value("${app.frontend-url:http://localhost:3000}")
    private String frontendUrl;
    @Value("${spring.mail.username:no-reply@trainify.local}")
    private String mailFrom;

    public record InvitationDto(UUID id, String name, String email, Role role, String status, Instant expiresAt, String invitationToken) {}
    public record CompanyCreated(UUID id, String name, UUID invitationId, String invitationToken) {}
    public record InvitationLink(String invitationToken) {}

    @Transactional
    public CompanyCreated provision(ProvisionCompanyRequest request, CustomUserDetails actor) {
        return provision(request, actor, false);
    }

    @Transactional
    public CompanyCreated provision(ProvisionCompanyRequest request, CustomUserDetails actor, boolean manual) {
        requireSuperAdmin(actor);
        var existing = invitations.findById(request.requestId());
        if (existing.isPresent()) {
            var invitation = existing.get();
            if (!invitation.getEmail().equals(normalize(request.adminEmail()))
                    || !invitation.getName().equals(request.adminName().trim())
                    || !invitation.getTenant().getName().equals(request.name().trim())
                    || invitation.getRole() != Role.ADMIN) {
                throw new IllegalArgumentException("Esta solicitação já foi utilizada. Atualize a página.");
            }
            return new CompanyCreated(invitation.getTenant().getId(), invitation.getTenant().getName(), invitation.getId(), null);
        }
        // Empresa nova nao tem como ter conflito de e-mail: a mesma pessoa pode
        // administrar mais de uma empresa
        Tenant tenant = new Tenant();
        tenant.setName(request.name().trim());
        tenant.setPrimaryColor("#4B2C92");
        tenant.setSecondaryColor("#9D84B7");
        tenant = tenants.saveAndFlush(tenant);
        var created = create(tenant, new InviteUserRequest(request.requestId(), request.adminName(), request.adminEmail(), Role.ADMIN), manual);
        return new CompanyCreated(tenant.getId(), tenant.getName(), created.id(), created.invitationToken());
    }

    @Transactional
    public InvitationDto invite(UUID tenantId, InviteUserRequest request, CustomUserDetails actor) {
        return invite(tenantId, request, actor, false);
    }

    @Transactional
    public InvitationDto invite(UUID tenantId, InviteUserRequest request, CustomUserDetails actor, boolean manual) {
        requireManagement(tenantId, actor);
        if (request.role() == Role.SUPER_ADMIN) throw new AccessDeniedException("Convites não concedem acesso supremo.");
        var existing = invitations.findById(request.requestId());
        if (existing.isPresent()) {
            var invitation = existing.get();
            if (!invitation.getTenant().getId().equals(tenantId)
                    || !invitation.getEmail().equals(normalize(request.email()))
                    || !invitation.getName().equals(request.name().trim()) || invitation.getRole() != request.role()) {
                throw new IllegalArgumentException("Esta solicitação já foi utilizada. Atualize a página.");
            }
            return dto(invitation);
        }
        ensureAvailable(request.email(), tenantId);
        Tenant tenant = tenants.findById(tenantId).orElseThrow(() -> new EntityNotFoundException("Empresa não encontrada."));
        return create(tenant, request, manual);
    }

    @Transactional
    public InvitationLink generateLink(UUID tenantId, UUID id, CustomUserDetails actor) {
        requireManagement(tenantId, actor);
        var invitation = managed(tenantId, id);
        requirePending(invitation);
        if (users.existsByEmailIgnoreCaseAndTenantId(invitation.getEmail(), invitation.getTenant().getId())) throw new IllegalArgumentException("Esta empresa já tem uma conta com este e-mail.");
        return new InvitationLink(issueToken(invitation));
    }

    @Transactional(readOnly = true)
    public List<InvitationDto> list(UUID tenantId, CustomUserDetails actor) {
        requireManagement(tenantId, actor);
        return invitations.findByTenantIdOrderByCreatedAtDesc(tenantId).stream().map(this::dto).toList();
    }

    @Transactional
    public void resend(UUID tenantId, UUID id, CustomUserDetails actor) {
        requireManagement(tenantId, actor);
        var invitation = managed(tenantId, id);
        requirePending(invitation);
        if (users.existsByEmailIgnoreCaseAndTenantId(invitation.getEmail(), invitation.getTenant().getId())) throw new IllegalArgumentException("Esta empresa já tem uma conta com este e-mail.");
        send(invitation);
    }

    @Transactional
    public void revoke(UUID tenantId, UUID id, CustomUserDetails actor) {
        requireManagement(tenantId, actor);
        var invitation = managed(tenantId, id);
        requirePending(invitation);
        invitation.setRevokedAt(Instant.now());
        invitation.setTokenHash(null);
        invitations.save(invitation);
    }

    @Transactional
    public void accept(AcceptInvitationRequest request) {
        if (request.password().getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new IllegalArgumentException("A senha é muito longa. Use no máximo 72 bytes.");
        }
        var invitation = invitations.findForAcceptance(hash(request.token()))
                .orElseThrow(() -> new IllegalArgumentException("Convite inválido, expirado ou já utilizado."));
        requirePending(invitation);
        if (!invitation.getExpiresAt().isAfter(Instant.now()) || invitation.getTenant().getDeletedAt() != null) {
            throw new IllegalArgumentException("Convite expirado ou indisponível. Solicite um novo ao administrador.");
        }
        if (users.existsByEmailIgnoreCaseAndTenantId(invitation.getEmail(), invitation.getTenant().getId())) throw new IllegalArgumentException("Você já tem conta nesta empresa. Entre pela tela de login.");
        User user = new User();
        user.setTenant(invitation.getTenant());
        user.setName(invitation.getName());
        user.setEmail(invitation.getEmail());
        user.setRole(invitation.getRole());
        user.setPasswordHash(passwords.encode(request.password()));
        user.setIsActive(true);
        users.saveAndFlush(user);
        invitation.setAcceptedAt(Instant.now());
        invitation.setTokenHash(null);
        invitations.save(invitation);
    }

    private InvitationDto create(Tenant tenant, InviteUserRequest request, boolean manual) {
        CompanyInvitation invitation = new CompanyInvitation();
        invitation.setId(request.requestId());
        invitation.setTenant(tenant);
        invitation.setName(request.name().trim());
        invitation.setEmail(normalize(request.email()));
        invitation.setRole(request.role());
        if (!manual) {
            send(invitation);
            return dto(invitation);
        }
        String token = issueToken(invitation);
        return new InvitationDto(invitation.getId(), invitation.getName(), invitation.getEmail(), invitation.getRole(),
                "PENDING", invitation.getExpiresAt(), token);
    }

    private String issueToken(CompanyInvitation invitation) {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String token = HexFormat.of().formatHex(bytes);
        invitation.setTokenHash(hash(token));
        invitation.setExpiresAt(Instant.now().plusSeconds(48 * 60 * 60));
        invitations.saveAndFlush(invitation);
        return token;
    }

    private void send(CompanyInvitation invitation) {
        String token = issueToken(invitation);
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(mailFrom);
        message.setTo(invitation.getEmail());
        message.setSubject("Convite para " + invitation.getTenant().getName() + " na Trainify");
        message.setText("Olá, " + invitation.getName() + ".\n\nVocê foi convidado para o ambiente da empresa "
                + invitation.getTenant().getName() + " na Trainify. Defina sua senha pelo link abaixo, válido por 48 horas:\n"
                + frontendUrl.replaceAll("/+$", "") + "/accept-invitation#token=" + token
                + "\n\nO link é pessoal e pode ser usado uma única vez. Se não reconhece o convite, ignore este e-mail.");
        mail.send(message);
    }

    /**
     * O mesmo e-mail pode ter conta em outra empresa, por exemplo um consultor que
     * atende duas clientes. O conflito so existe dentro da mesma empresa.
     */
    private void ensureAvailable(String email, java.util.UUID tenantId) {
        String normalized = normalize(email);
        if (users.existsByEmailIgnoreCaseAndTenantId(normalized, tenantId)
                || invitations.existsByEmailIgnoreCaseAndTenantIdAndAcceptedAtIsNullAndRevokedAtIsNull(normalized, tenantId)) {
            throw new IllegalArgumentException("Esta empresa já tem uma conta ou convite pendente para este e-mail. Reenvie ou revogue o convite existente.");
        }
    }

    private CompanyInvitation managed(UUID tenantId, UUID id) {
        return invitations.findForManagement(id, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Convite não encontrado nesta empresa."));
    }

    private void requirePending(CompanyInvitation invitation) {
        if (invitation.getAcceptedAt() != null || invitation.getRevokedAt() != null) {
            throw new IllegalArgumentException("Este convite já foi utilizado ou revogado.");
        }
    }

    private void requireSuperAdmin(CustomUserDetails actor) {
        if (!hasRole(actor, "SUPER_ADMIN")) throw new AccessDeniedException("Apenas a equipe Trainify pode criar empresas.");
    }

    private void requireManagement(UUID tenantId, CustomUserDetails actor) {
        if (hasRole(actor, "SUPER_ADMIN")) return;
        if (!hasRole(actor, "ADMIN") || !actor.getTenantId().equals(tenantId)) {
            throw new AccessDeniedException("Sem permissão para gerenciar convites desta empresa.");
        }
    }

    private boolean hasRole(CustomUserDetails actor, String role) {
        return actor != null && actor.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_" + role));
    }

    private InvitationDto dto(CompanyInvitation invitation) {
        String status = invitation.getAcceptedAt() != null ? "ACCEPTED" : invitation.getRevokedAt() != null ? "REVOKED"
                : invitation.getExpiresAt().isAfter(Instant.now()) ? "PENDING" : "EXPIRED";
        return new InvitationDto(invitation.getId(), invitation.getName(), invitation.getEmail(),
                invitation.getRole(), status, invitation.getExpiresAt(), null);
    }

    private String normalize(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String hash(String token) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 indisponível.", exception);
        }
    }
}
