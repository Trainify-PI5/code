package com.trainify.lms.dto;

import lombok.Data;
import java.util.UUID;

@Data
public class TenantDto {
    private UUID id;
    private String name;
    private String domain;
    private String primaryColor;
    private String secondaryColor;
    private String logoUrl;
}
