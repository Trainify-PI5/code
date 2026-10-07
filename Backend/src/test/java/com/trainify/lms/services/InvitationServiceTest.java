package com.trainify.lms.services;

import com.trainify.lms.domain.entities.*;
import com.trainify.lms.domain.enums.Role;
import com.trainify.lms.dto.*;
import com.trainify.lms.repositories.*;
import com.trainify.lms.security.CustomUserDetails;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.*;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import java.time.Instant;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InvitationServiceTest {
    @Mock CompanyInvitationRepository invitations;
    @Mock TenantRepository tenants;
    @Mock UserRepository users;
    @Mock PasswordEncoder passwords;
    @Mock JavaMailSender mail;
    @InjectMocks InvitationService service;
    Tenant tenant;
    CompanyInvitation invitation;

    @BeforeEach void setup() {
        tenant = new Tenant();
        tenant.setId(UUID.randomUUID());
        tenant.setName("Cliente");
        invitation = new CompanyInvitation();
        invitation.setId(UUID.randomUUID());
        invitation.setTenant(tenant);
        invitation.setName("Pessoa");
        invitation.setEmail("pessoa@example.com");
        invitation.setRole(Role.ADMIN);
        invitation.setTokenHash("stored-hash");
        invitation.setExpiresAt(Instant.now().plusSeconds(600));
        ReflectionTestUtils.setField(service, "frontendUrl", "https://trainify.example");
        ReflectionTestUtils.setField(service, "mailFrom", "team@example.com");
    }

    private CustomUserDetails actor(Role role, UUID tenantId) {
        User user = new User();
        Tenant company = new Tenant();
        company.setId(tenantId);
        user.setTenant(company);
        user.setRole(role);
        return new CustomUserDetails(user);
    }

    @Test void onlySupremeCanProvisionCompanies() {
        assertThrows(AccessDeniedException.class, () -> service.provision(
                new ProvisionCompanyRequest(UUID.randomUUID(), "Cliente", "Admin", "admin@example.com"),
                actor(Role.ADMIN, tenant.getId())));
        verifyNoInteractions(tenants, invitations, users, mail);
    }

    @Test void companyAndInvitationUseTheNewTenantAndAdminRole() {
        when(tenants.saveAndFlush(any())).thenAnswer(call -> {
            Tenant saved = call.getArgument(0);
            saved.setId(tenant.getId());
            return saved;
        });
        var result = service.provision(new ProvisionCompanyRequest(UUID.randomUUID(), " Cliente ", " Admin ", "ADMIN@example.com"),
                actor(Role.SUPER_ADMIN, UUID.randomUUID()));
        ArgumentCaptor<CompanyInvitation> captured = ArgumentCaptor.forClass(CompanyInvitation.class);
        verify(invitations).saveAndFlush(captured.capture());
        assertEquals(result.id(), captured.getValue().getTenant().getId());
        assertEquals(Role.ADMIN, captured.getValue().getRole());
        assertEquals("admin@example.com", captured.getValue().getEmail());
        assertEquals(64, captured.getValue().getTokenHash().length());
        ArgumentCaptor<SimpleMailMessage> message = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mail).send(message.capture());
        assertTrue(message.getValue().getText().contains("/accept-invitation#token="));
        assertFalse(message.getValue().getText().contains(captured.getValue().getTokenHash()));
    }

    @Test void retryDoesNotCreateAnotherCompanyOrSendAnotherMessage() {
        when(invitations.findById(invitation.getId())).thenReturn(Optional.of(invitation));
        service.provision(new ProvisionCompanyRequest(invitation.getId(), "Cliente", "Pessoa", "pessoa@example.com"),
                actor(Role.SUPER_ADMIN, UUID.randomUUID()));
        verifyNoInteractions(tenants, users, mail);
    }

    @Test void duplicateEmailDoesNotCreateCompany() {
        when(users.existsByEmailIgnoreCase("pessoa@example.com")).thenReturn(true);
        assertThrows(IllegalArgumentException.class, () -> service.provision(
                new ProvisionCompanyRequest(UUID.randomUUID(), "Cliente", "Pessoa", "pessoa@example.com"),
                actor(Role.SUPER_ADMIN, UUID.randomUUID())));
        verifyNoInteractions(tenants, mail);
    }

    @Test void tenantAdminCannotInviteIntoAnotherCompany() {
        assertThrows(AccessDeniedException.class, () -> service.invite(UUID.randomUUID(),
                new InviteUserRequest(UUID.randomUUID(), "Pessoa", "pessoa@example.com", Role.STUDENT),
                actor(Role.ADMIN, tenant.getId())));
        verifyNoInteractions(invitations, users, tenants, mail);
    }

    @Test void invitationsCannotGrantSupremeRole() {
        assertThrows(AccessDeniedException.class, () -> service.invite(tenant.getId(),
                new InviteUserRequest(UUID.randomUUID(), "Pessoa", "pessoa@example.com", Role.SUPER_ADMIN),
                actor(Role.SUPER_ADMIN, tenant.getId())));
        verifyNoInteractions(invitations, users, tenants, mail);
    }

    @Test void acceptanceUsesEmailRoleAndTenantFromInvitationAndConsumesToken() {
        when(invitations.findForAcceptance(anyString())).thenReturn(Optional.of(invitation));
        when(passwords.encode("password123")).thenReturn("encoded");
        service.accept(new AcceptInvitationRequest("a".repeat(64), "password123"));
        ArgumentCaptor<User> captured = ArgumentCaptor.forClass(User.class);
        verify(users).saveAndFlush(captured.capture());
        assertEquals(tenant, captured.getValue().getTenant());
        assertEquals(Role.ADMIN, captured.getValue().getRole());
        assertEquals("pessoa@example.com", captured.getValue().getEmail());
        assertEquals("encoded", captured.getValue().getPasswordHash());
        assertNotNull(invitation.getAcceptedAt());
        assertNull(invitation.getTokenHash());
        assertThrows(IllegalArgumentException.class, () -> service.accept(new AcceptInvitationRequest("a".repeat(64), "password123")));
        verify(users, times(1)).saveAndFlush(any());
    }

    @Test void expiredInvitationCannotCreateAccount() {
        invitation.setExpiresAt(Instant.now().minusSeconds(1));
        when(invitations.findForAcceptance(anyString())).thenReturn(Optional.of(invitation));
        assertThrows(IllegalArgumentException.class, () -> service.accept(new AcceptInvitationRequest("a".repeat(64), "password123")));
        verifyNoInteractions(users, passwords);
    }

    @Test void revokedInvitationCannotCreateAccount() {
        invitation.setRevokedAt(Instant.now());
        when(invitations.findForAcceptance(anyString())).thenReturn(Optional.of(invitation));
        assertThrows(IllegalArgumentException.class, () -> service.accept(new AcceptInvitationRequest("a".repeat(64), "password123")));
        verifyNoInteractions(users, passwords);
    }

    @Test void resendingReplacesTokenAndExtendsExpiration() {
        when(invitations.findForManagement(invitation.getId(), tenant.getId())).thenReturn(Optional.of(invitation));
        service.resend(tenant.getId(), invitation.getId(), actor(Role.ADMIN, tenant.getId()));
        assertNotEquals("stored-hash", invitation.getTokenHash());
        assertTrue(invitation.getExpiresAt().isAfter(Instant.now().plusSeconds(47 * 3600)));
        verify(mail).send(any(SimpleMailMessage.class));
    }

    @Test void revocationInvalidatesToken() {
        when(invitations.findForManagement(invitation.getId(), tenant.getId())).thenReturn(Optional.of(invitation));
        service.revoke(tenant.getId(), invitation.getId(), actor(Role.ADMIN, tenant.getId()));
        assertNull(invitation.getTokenHash());
        assertNotNull(invitation.getRevokedAt());
        verifyNoInteractions(mail);
    }

    @Test void emailFailurePropagatesForTransactionRollback() {
        when(tenants.findById(tenant.getId())).thenReturn(Optional.of(tenant));
        doThrow(new MailSendException("offline")).when(mail).send(any(SimpleMailMessage.class));
        assertThrows(MailSendException.class, () -> service.invite(tenant.getId(),
                new InviteUserRequest(UUID.randomUUID(), "Pessoa", "pessoa@example.com", Role.STUDENT),
                actor(Role.ADMIN, tenant.getId())));
    }

    @Test void cannotManageAnotherTenantsInvitations() {
        CustomUserDetails admin = actor(Role.ADMIN, UUID.randomUUID());
        assertThrows(AccessDeniedException.class, () -> service.list(tenant.getId(), admin));
        assertThrows(AccessDeniedException.class, () -> service.resend(tenant.getId(), invitation.getId(), admin));
        assertThrows(AccessDeniedException.class, () -> service.revoke(tenant.getId(), invitation.getId(), admin));
        verifyNoInteractions(invitations);
    }
}

