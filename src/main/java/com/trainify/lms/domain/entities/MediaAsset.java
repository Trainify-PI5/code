package com.trainify.lms.domain.entities;

import com.trainify.lms.domain.enums.TranscriptionStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import com.trainify.lms.domain.listeners.MediaAssetListener;

@Entity
@Table(name = "media_assets")
@EntityListeners(MediaAssetListener.class)
@Getter
@Setter
public class MediaAsset extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id")
    private Course course;

    @Column(name = "s3_key", length = 500, unique = true)
    private String s3Key;

    @Enumerated(EnumType.STRING)
    @Column(name = "provider", length = 50)
    private com.trainify.lms.domain.enums.MediaProvider provider = com.trainify.lms.domain.enums.MediaProvider.S3;

    @Column(name = "external_url", length = 1000)
    private String externalUrl;

    @Column(name = "original_filename", length = 255)
    private String originalFilename;

    @Column(name = "mime_type", length = 50, nullable = false)
    private String mimeType;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "duration_seconds")
    private Integer durationSeconds;

    @Enumerated(EnumType.STRING)
    @Column(name = "transcription_status", length = 30)
    private TranscriptionStatus transcriptionStatus = TranscriptionStatus.PENDING;

    @Column(name = "subtitles_url", length = 1000)
    private String subtitlesUrl;
}
