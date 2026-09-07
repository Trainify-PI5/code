package com.trainify.lms.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.util.Map;
import java.util.UUID;

@Data
public class SubmitAssessmentRequest {
    @NotNull
    private Map<UUID, UUID> answers; // Map de QuestionId -> OptionId
}
