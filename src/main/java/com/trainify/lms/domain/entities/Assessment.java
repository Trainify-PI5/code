package com.trainify.lms.domain.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "assessments")
@Getter
@Setter
public class Assessment extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lesson_id", nullable = false)
    private Lesson lesson;

    @Column(length = 200)
    private String title;

    @Column(name = "passing_score", nullable = false)
    private Integer passingScore = 70;

    @OneToMany(mappedBy = "assessment", cascade = CascadeType.ALL, orphanRemoval = true)
    private java.util.List<AssessmentQuestion> questions = new java.util.ArrayList<>();
}
