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

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<CertificationDto>> getUserCertifications(@AuthenticationPrincipal CustomUserDetails principal) {
        return ResponseEntity.ok(certificationService.getUserCertifications(principal.getId()));
    }
}
