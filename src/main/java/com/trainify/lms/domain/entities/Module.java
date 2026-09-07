package com.trainify.lms.domain.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "modules")
@Getter
@Setter
public class Module extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    @Column(length = 200, nullable = false)
    private String title;

    @Column(name = "order_index", nullable = false)
    private Integer orderIndex = 0;
}
