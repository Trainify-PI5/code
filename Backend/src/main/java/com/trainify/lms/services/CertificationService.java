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
        cert.setCertificateUrl("https://trainify.com/certs/" + java.util.UUID.randomUUID().toString() + ".pdf");
        
        certificationRepository.save(cert);
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
        dto.setCertificateUrl(cert.getCertificateUrl());
        return dto;
    }
}
