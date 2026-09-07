package com.trainify.lms.services;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

import java.util.UUID;

@Getter
public class EnrollmentProgressEvent extends ApplicationEvent {
    
    private final UUID enrollmentId;

    public EnrollmentProgressEvent(UUID enrollmentId) {
        super(enrollmentId);
        this.enrollmentId = enrollmentId;
    }
}
