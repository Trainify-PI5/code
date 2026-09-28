package com.trainify.lms.controllers;

import com.trainify.lms.dto.CertificationDto;
import com.trainify.lms.security.CustomUserDetails;
import com.trainify.lms.services.CertificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/certifications")
@RequiredArgsConstructor
public class CertificationController {

    private final CertificationService certificationService;

    /** Certificado em PDF, pronto para o navegador baixar. */
    @GetMapping(value = "/{id}/pdf", produces = org.springframework.http.MediaType.APPLICATION_PDF_VALUE)
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<byte[]> downloadPdf(
            @org.springframework.web.bind.annotation.PathVariable java.util.UUID id,
            @AuthenticationPrincipal CustomUserDetails principal) {

        byte[] pdf = certificationService.generatePdf(id, principal);

        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=\"certificado-" + id + ".pdf\"")
                .body(pdf);
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<CertificationDto>> getUserCertifications(@AuthenticationPrincipal CustomUserDetails principal) {
        return ResponseEntity.ok(certificationService.getUserCertifications(principal.getId()));
    }
}
