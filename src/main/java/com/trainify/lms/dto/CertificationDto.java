package com.trainify.lms.dto;

import lombok.Data;
import java.time.Instant;
import java.util.UUID;

@Data
public class CertificationDto {
    private UUID id;
    private UUID courseId;
    private String courseTitle;
    private Integer score;
    private Instant issuedAt;
    private String certificateUrl;
}
