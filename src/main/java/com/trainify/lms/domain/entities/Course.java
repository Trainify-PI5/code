package com.trainify.lms.domain.entities;

import com.trainify.lms.domain.enums.CourseStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;

@Entity
@Table(name = "courses")
@SQLRestriction("deleted_at IS NULL")
@SQLDelete(sql = "UPDATE courses SET deleted_at = NOW() WHERE id = ?")
@Getter
@Setter
public class Course extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "instructor_id")
    private User instructor;

    @Column(length = 200, nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private CourseStatus status = CourseStatus.DRAFT;

    @Version
    @Column(name = "version_id", nullable = false)
    private Integer versionId;
}
