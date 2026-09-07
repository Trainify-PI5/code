package com.trainify.lms.domain.entities;

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.util.UUID;

@Data
@Entity
@Table(name = "notifications")
public class Notification {
    
    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "created_at")
    private java.time.OffsetDateTime createdAt;
    
    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = java.time.OffsetDateTime.now();
        }
    }

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(length = 50, nullable = false)
    private String type;

    @Column(length = 200)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String message;

    @Column(name = "is_read")
    private boolean isRead = false;

    @Column(name = "reference_id")
    private UUID referenceId;
}
