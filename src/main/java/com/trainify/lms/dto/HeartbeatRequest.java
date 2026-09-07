package com.trainify.lms.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class HeartbeatRequest {
    @NotNull
    @Min(0)
    private Integer watchedSeconds;

    @NotNull
    private Boolean isCompleted;
}
