package com.trainify.lms.dto;

import lombok.Data;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
public class NotificationDto {
    private UUID id;
    private String type;
    private String title;
    private String message;
    private boolean isRead;
    private UUID referenceId;
    private OffsetDateTime createdAt;
}
