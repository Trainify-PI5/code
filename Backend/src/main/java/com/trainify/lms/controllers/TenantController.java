package com.trainify.lms.controllers;

import com.trainify.lms.dto.CreateTenantRequest;
import com.trainify.lms.dto.TenantDto;
import com.trainify.lms.dto.UpdateTenantRequest;
import com.trainify.lms.services.TenantService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/tenants")
@RequiredArgsConstructor
public class TenantController {

    private final TenantService tenantService;

    @GetMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<List<TenantDto>> getAllTenants() {
        return ResponseEntity.ok(tenantService.getAllTenants());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<TenantDto> getTenantById(@PathVariable UUID id) {
        return ResponseEntity.ok(tenantService.getTenantById(id));
    }

    @GetMapping("/me")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<TenantDto> getMyTenant(@AuthenticationPrincipal com.trainify.lms.security.CustomUserDetails userDetails) {
        return ResponseEntity.ok(tenantService.getTenantById(userDetails.getTenantId()));
    }

    @PutMapping("/me")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<TenantDto> updateMyTenant(
            @AuthenticationPrincipal com.trainify.lms.security.CustomUserDetails userDetails,
            @Valid @RequestBody UpdateTenantRequest request) {
        return ResponseEntity.ok(tenantService.updateTenant(userDetails.getTenantId(), request));
    }
}
