package com.trainify.lms.domain.entities;

import com.trainify.lms.domain.enums.QuestionType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "assessment_questions")
@Getter
@Setter
public class AssessmentQuestion extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assessment_id", nullable = false)
    private Assessment assessment;

    @Column(name = "question_text", columnDefinition = "TEXT", nullable = false)
    private String questionText;

    @Enumerated(EnumType.STRING)
    @Column(name = "question_type", length = 30)
    private QuestionType questionType = QuestionType.MULTIPLE_CHOICE;

    @Column(name = "order_index", nullable = false)
    private Integer orderIndex = 0;

    @OneToMany(mappedBy = "question", cascade = CascadeType.ALL, orphanRemoval = true)
    private java.util.List<AssessmentOption> options = new java.util.ArrayList<>();
}
