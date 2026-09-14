package com.trainify.lms.dto;

import com.trainify.lms.domain.enums.EnrollmentStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StatusCountDto {
    private EnrollmentStatus status;
    private long count;
}
