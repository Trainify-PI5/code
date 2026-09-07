package com.trainify.lms.controllers;

import com.trainify.lms.clients.IaServiceClient;
import com.trainify.lms.domain.entities.MediaAsset;
import com.trainify.lms.domain.entities.Tenant;
import com.trainify.lms.dto.GenerateUploadUrlRequest;
import com.trainify.lms.dto.UploadCompleteRequest;
import com.trainify.lms.repositories.MediaAssetRepository;
import com.trainify.lms.security.CustomUserDetails;
import com.trainify.lms.services.S3Service;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/media")
@RequiredArgsConstructor
@Slf4j
public class MediaController {

    private final S3Service s3Service;
    private final MediaAssetRepository mediaAssetRepository;
    private final IaServiceClient iaServiceClient;

    @PostMapping("/upload-url")
    @PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR')")
    public ResponseEntity<Map<String, String>> generateUploadUrl(
            @Valid @RequestBody GenerateUploadUrlRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        String ext = request.getFilename().substring(request.getFilename().lastIndexOf('.'));
        String key = "tenant-" + userDetails.getTenantId() + "/videos/" + UUID.randomUUID() + ext;
        
        String presignedUrl = s3Service.generatePresignedUploadUrl(key, request.getContentType());
        
        return ResponseEntity.ok(Map.of(
                "url", presignedUrl,
                "key", key
        ));
    }

    @PostMapping("/upload-complete")
    @PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR')")
    public ResponseEntity<Map<String, UUID>> uploadComplete(
            @Valid @RequestBody UploadCompleteRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        Tenant tenant = new Tenant();
        tenant.setId(userDetails.getTenantId());

        MediaAsset mediaAsset = new MediaAsset();
        mediaAsset.setTenant(tenant);
        mediaAsset.setS3Key(request.getKey());
        mediaAsset.setOriginalFilename(request.getFilename());
        mediaAsset.setMimeType(request.getContentType());
        mediaAsset.setFileSize(request.getSize());
        
        mediaAsset = mediaAssetRepository.save(mediaAsset);
        
        try {
            iaServiceClient.triggerTranscription(new IaServiceClient.TranscribeRequest(
                    mediaAsset.getId().toString(),
                    request.getKey(),
                    userDetails.getTenantId().toString(),
                    "" // CourseId não disponível diretamente aqui sem vínculo da lição
            ));
            log.info("Disparou IA task de transcrição para video {}", mediaAsset.getId());
        } catch (Exception e) {
            log.error("Falha ao comunicar com IA Service: {}", e.getMessage());
        }

        return ResponseEntity.ok(Map.of("id", mediaAsset.getId()));
    }

    @PostMapping("/external")
    @PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR')")
    public ResponseEntity<Map<String, UUID>> createExternalMedia(
            @Valid @RequestBody com.trainify.lms.dto.CreateExternalMediaRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        Tenant tenant = new Tenant();
        tenant.setId(userDetails.getTenantId());

        MediaAsset mediaAsset = new MediaAsset();
        mediaAsset.setTenant(tenant);
        mediaAsset.setProvider(request.getProvider());
        mediaAsset.setExternalUrl(request.getUrl());
        mediaAsset.setMimeType("application/vnd.trainify.external");
        mediaAsset.setOriginalFilename("External " + request.getProvider().name());

        mediaAsset = mediaAssetRepository.save(mediaAsset);

        return ResponseEntity.ok(Map.of("id", mediaAsset.getId()));
    }

    @GetMapping("/{id}/play")
    public ResponseEntity<Map<String, String>> getPlayUrl(@PathVariable UUID id) {
        MediaAsset mediaAsset = mediaAssetRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("MediaAsset not found"));

        if (mediaAsset.getProvider() != null && mediaAsset.getProvider() != com.trainify.lms.domain.enums.MediaProvider.S3) {
            return ResponseEntity.ok(Map.of("url", mediaAsset.getExternalUrl()));
        }

        String presignedUrl = s3Service.generatePresignedDownloadUrl(mediaAsset.getS3Key());
        
        return ResponseEntity.ok(Map.of("url", presignedUrl));
    }
}
