package com.trainify.lms.services;

import com.trainify.lms.domain.entities.Tenant;
import com.trainify.lms.dto.CreateTenantRequest;
import com.trainify.lms.dto.TenantDto;
import com.trainify.lms.dto.UpdateTenantRequest;
import com.trainify.lms.repositories.TenantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityNotFoundException;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TenantService {

    private final TenantRepository tenantRepository;

    @Transactional(readOnly = true)
    public List<TenantDto> getAllTenants() {
        return tenantRepository.findAll().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public TenantDto getTenantById(UUID id) {
        return tenantRepository.findById(id)
                .map(this::mapToDto)
                .orElseThrow(() -> new EntityNotFoundException("Tenant not found"));
    }

    @Transactional
    public TenantDto createTenant(CreateTenantRequest request) {
        Tenant tenant = new Tenant();
        tenant.setName(request.getName());
        tenant.setDomain(request.getDomain());

        return mapToDto(tenantRepository.save(tenant));
    }

    @Transactional
    public TenantDto updateTenant(UUID id, UpdateTenantRequest request) {
        Tenant tenant = tenantRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Tenant not found"));

        tenant.setName(request.getName());
        tenant.setDomain(request.getDomain());
        tenant.setPrimaryColor(request.getPrimaryColor());
        tenant.setSecondaryColor(request.getSecondaryColor());
        tenant.setLogoUrl(request.getLogoUrl());

        return mapToDto(tenantRepository.save(tenant));
    }

    private TenantDto mapToDto(Tenant tenant) {
        TenantDto dto = new TenantDto();
        dto.setId(tenant.getId());
        dto.setName(tenant.getName());
        dto.setDomain(tenant.getDomain());
        dto.setPrimaryColor(tenant.getPrimaryColor());
        dto.setSecondaryColor(tenant.getSecondaryColor());
        dto.setLogoUrl(tenant.getLogoUrl());
        return dto;
    }
}
