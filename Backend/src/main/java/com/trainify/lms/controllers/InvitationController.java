package com.trainify.lms.controllers;

import com.trainify.lms.dto.*;
import com.trainify.lms.security.CustomUserDetails;
import com.trainify.lms.services.InvitationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class InvitationController {
    private final InvitationService service;

    @PostMapping("/tenants")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<InvitationService.CompanyCreated> provision(@Valid @RequestBody ProvisionCompanyRequest request,
            @AuthenticationPrincipal CustomUserDetails actor) {
        return ResponseEntity.status(201).body(service.provision(request, actor));
    }

    @GetMapping("/tenants/{tenantId}/invitations")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<List<InvitationService.InvitationDto>> list(@PathVariable UUID tenantId,
            @AuthenticationPrincipal CustomUserDetails actor) {
        return ResponseEntity.ok().header("Cache-Control", "no-store").body(service.list(tenantId, actor));
    }

    @PostMapping("/tenants/{tenantId}/invitations")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<InvitationService.InvitationDto> invite(@PathVariable UUID tenantId,
            @Valid @RequestBody InviteUserRequest request, @AuthenticationPrincipal CustomUserDetails actor) {
        return ResponseEntity.status(201).body(service.invite(tenantId, request, actor));
    }

    @PostMapping("/tenants/{tenantId}/invitations/{id}/resend")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Void> resend(@PathVariable UUID tenantId, @PathVariable UUID id,
            @AuthenticationPrincipal CustomUserDetails actor) {
        service.resend(tenantId, id, actor);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/tenants/{tenantId}/invitations/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Void> revoke(@PathVariable UUID tenantId, @PathVariable UUID id,
            @AuthenticationPrincipal CustomUserDetails actor) {
        service.revoke(tenantId, id, actor);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/auth/invitations/accept")
    public ResponseEntity<Void> accept(@Valid @RequestBody AcceptInvitationRequest request) {
        service.accept(request);
        return ResponseEntity.noContent().build();
    }
}

