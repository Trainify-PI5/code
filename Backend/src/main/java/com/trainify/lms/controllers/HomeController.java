package com.trainify.lms.controllers;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.trainify.lms.dto.HomeSummaryDto;
import com.trainify.lms.security.CustomUserDetails;
import com.trainify.lms.services.HomeSummaryService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/home")
@RequiredArgsConstructor
public class HomeController {

    private final HomeSummaryService homeSummaryService;

    @GetMapping("/summary")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<HomeSummaryDto> summary(@AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(homeSummaryService.summaryFor(userDetails));
    }
}
