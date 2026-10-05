package com.trainify.lms.services;

import com.trainify.lms.domain.entities.Certification;
import com.trainify.lms.domain.entities.Course;
import com.trainify.lms.domain.entities.Tenant;
import com.trainify.lms.domain.entities.User;
import com.trainify.lms.repositories.CertificationRepository;
import com.trainify.lms.security.CustomUserDetails;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CertificationServiceTest {
    @Mock CertificationRepository repository;
    @Mock CertificatePdfService pdfService;
    @InjectMocks CertificationService service;

    @Test
    void issuesCertificateWithoutInventingScore() {
        User user = new User();
        user.setId(UUID.randomUUID());
        Course course = new Course();
        course.setId(UUID.randomUUID());
        when(repository.findByUserId(user.getId())).thenReturn(List.of());

        service.issueCertification(user, course);

        var saved = ArgumentCaptor.forClass(Certification.class);
        verify(repository).save(saved.capture());
        assertNull(saved.getValue().getScore());
        assertSame(course, saved.getValue().getCourse());
    }

    @Test
    void doesNotExposeLegacyFixedScore() throws Exception {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setName("Aluno");
        Tenant tenant = new Tenant();
        tenant.setId(UUID.randomUUID());
        tenant.setName("Empresa");
        Course course = new Course();
        course.setTitle("Curso");
        Certification cert = new Certification();
        cert.setId(UUID.randomUUID());
        cert.setUser(user);
        cert.setTenant(tenant);
        cert.setCourse(course);
        cert.setScore(100);
        cert.setIssuedAt(Instant.now());
        when(repository.findByUserId(user.getId())).thenReturn(List.of(cert));
        assertNull(service.getUserCertifications(user.getId()).get(0).getScore());

        when(repository.findById(cert.getId())).thenReturn(Optional.of(cert));
        CustomUserDetails principal = mock(CustomUserDetails.class);
        when(principal.getId()).thenReturn(user.getId());
        when(principal.getTenantId()).thenReturn(tenant.getId());
        doReturn(List.of()).when(principal).getAuthorities();
        service.generatePdf(cert.getId(), principal);
        verify(pdfService).generate("Aluno", "Curso", "Empresa", null, cert.getIssuedAt(), cert.getId());
    }
}
