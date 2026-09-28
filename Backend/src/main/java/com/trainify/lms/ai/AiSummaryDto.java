package com.trainify.lms.ai;

import java.util.List;

import lombok.Data;

@Data
public class AiSummaryDto {
    private String summary;
    private List<String> keyPoints;
}
