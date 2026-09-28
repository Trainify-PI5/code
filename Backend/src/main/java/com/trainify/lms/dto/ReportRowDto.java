package com.trainify.lms.dto;

import com.trainify.lms.domain.enums.EnrollmentStatus;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

/**
 * Uma linha do relatorio de acompanhamento: quem, qual curso, como está e quanto
 * tirou. O frontend monta o arquivo (CSV ou planilha) a partir daqui.
 */
@Data
public class ReportRowDto {
    private UUID enrollmentId;
    private UUID studentId;
    private String studentName;
    private String studentEmail;
    private UUID courseId;
    private String courseTitle;
    private EnrollmentStatus status;
    private int progressPercent;
    private int completedLessons;
    private int totalLessons;
    private Integer bestScore;
    private Instant enrolledAt;
    private Instant completedAt;
}
