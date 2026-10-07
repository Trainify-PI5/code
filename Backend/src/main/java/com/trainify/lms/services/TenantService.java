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
    private final S3Service s3Service;

    public java.util.Map<String, String> createLogoUpload(UUID tenantId, String contentType) {
        String extension = switch (contentType == null ? "" : contentType) {
            case "image/png" -> ".png";
            case "image/jpeg" -> ".jpg";
            case "image/webp" -> ".webp";
            default -> throw new IllegalArgumentException("Use uma imagem PNG, JPEG ou WebP.");
        };
        String key = "tenant-" + tenantId + "/logos/" + UUID.randomUUID() + extension;
        return java.util.Map.of("key", key, "url", s3Service.generatePresignedUploadUrl(key, contentType),
                "previewUrl", s3Service.generatePresignedDownloadUrl(key));
    }

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

        String domain = request.getDomain() == null || request.getDomain().isBlank() ? null : request.getDomain().trim().toLowerCase(java.util.Locale.ROOT);
        if (domain != null) {
            if (!domain.matches("(?=.{1,100}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+")) {
                throw new IllegalArgumentException("Informe um domínio sem protocolo ou caminho.");
            }
            tenantRepository.findByDomain(domain).filter(other -> !other.getId().equals(id)).ifPresent(other -> {
                throw new IllegalArgumentException("Este domínio já está associado a outra empresa.");
            });
        }
        tenant.setName(request.getName().trim());
        tenant.setDomain(domain);
        tenant.setPrimaryColor(request.getPrimaryColor());
        tenant.setSecondaryColor(request.getSecondaryColor());
        if (request.getLogoKey() != null) {
            String key = request.getLogoKey();
            if (key.isBlank()) {
                tenant.setLogoUrl(null);
            } else {
                String prefix = "tenant-" + id + "/logos/";
                if (!key.startsWith(prefix) || !key.substring(prefix.length()).matches("[a-f0-9-]{36}\\.(png|jpg|webp)")) {
                    throw new IllegalArgumentException("A logo precisa pertencer à sua empresa.");
                }
                if (!("s3:" + key).equals(tenant.getLogoUrl())) s3Service.validateLogo(key);
                tenant.setLogoUrl("s3:" + key);
            }
        }

        return mapToDto(tenantRepository.save(tenant));
    }

    private TenantDto mapToDto(Tenant tenant) {
        TenantDto dto = new TenantDto();
        dto.setId(tenant.getId());
        dto.setName(tenant.getName());
        dto.setDomain(tenant.getDomain());
        dto.setPrimaryColor(tenant.getPrimaryColor());
        dto.setSecondaryColor(tenant.getSecondaryColor());
        String logo = tenant.getLogoUrl();
        if (logo != null && logo.startsWith("s3:")) {
            dto.setLogoKey(logo.substring(3));
            dto.setLogoUrl(s3Service.generatePresignedDownloadUrl(logo.substring(3)));
        } else {
            dto.setLogoUrl(logo);
        }
        return dto;
    }
}
