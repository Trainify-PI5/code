package com.trainify.lms.services;

import com.trainify.lms.domain.entities.Certification;
import com.trainify.lms.dto.CertificationDto;
import com.trainify.lms.repositories.CertificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CertificationService {

    private final CertificationRepository certificationRepository;
    private final CertificatePdfService certificatePdfService;

    @Transactional(readOnly = true)
    public List<CertificationDto> getUserCertifications(UUID userId) {
        return certificationRepository.findByUserId(userId).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public void issueCertification(com.trainify.lms.domain.entities.User user, com.trainify.lms.domain.entities.Course course) {
        // Verifica se já existe certificado para este usuário e curso
        boolean alreadyHasCert = certificationRepository.findByUserId(user.getId()).stream()
                .anyMatch(c -> c.getCourse() != null && c.getCourse().getId().equals(course.getId()));
        
        if (alreadyHasCert) return;
        
        Certification cert = new Certification();
        cert.setUser(user);
        cert.setCourse(course);
        cert.setTenant(user.getTenant());
        cert.setIssuedAt(java.time.Instant.now());
        cert.setScore(100);
        
        certificationRepository.save(cert);
    }

    /**
     * Certificado em PDF. So o dono do certificado, ou quem administra a empresa,
     * pode baixar.
     */
    @Transactional(readOnly = true)
    public byte[] generatePdf(UUID certificationId, com.trainify.lms.security.CustomUserDetails currentUser) {
        Certification cert = certificationRepository.findById(certificationId)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Certificado nao encontrado"));

        boolean dono = cert.getUser() != null && cert.getUser().getId().equals(currentUser.getId());
        boolean gestao = currentUser.getAuthorities().stream()
                .map(a -> a.getAuthority())
                .anyMatch(role -> role.equals("ROLE_SUPER_ADMIN") || role.equals("ROLE_ADMIN") || role.equals("ROLE_MANAGER"));
        boolean mesmaEmpresa = cert.getTenant() != null && cert.getTenant().getId().equals(currentUser.getTenantId());

        if (!mesmaEmpresa || (!dono && !gestao)) {
            throw new org.springframework.security.access.AccessDeniedException("Certificado de outro usuario");
        }

        try {
            return certificatePdfService.generate(
                    cert.getUser() != null ? cert.getUser().getName() : "",
                    cert.getCourse() != null ? cert.getCourse().getTitle() : "",
                    cert.getTenant() != null ? cert.getTenant().getName() : "Trainify",
                    cert.getScore(),
                    cert.getIssuedAt(),
                    cert.getId());
        } catch (java.io.IOException e) {
            throw new IllegalStateException("Falha ao gerar o PDF do certificado", e);
        }
    }

    private CertificationDto mapToDto(Certification cert) {
        CertificationDto dto = new CertificationDto();
        dto.setId(cert.getId());
        if (cert.getCourse() != null) {
            dto.setCourseId(cert.getCourse().getId());
            dto.setCourseTitle(cert.getCourse().getTitle());
        }
        dto.setScore(cert.getScore());
        dto.setIssuedAt(cert.getIssuedAt());
        // Endereco real de download, no lugar do link ficticio que era gravado antes
        dto.setCertificateUrl("/api/v1/certifications/" + cert.getId() + "/pdf");
        return dto;
    }
}
