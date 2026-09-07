package com.trainify.lms.domain.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "tenants")
@Getter
@Setter
public class Tenant extends BaseEntity {

    @Column(length = 150, nullable = false)
    private String name;

    @Column(length = 100, unique = true)
    private String domain;

    @Column(name = "primary_color", length = 7)
    private String primaryColor;

    @Column(name = "secondary_color", length = 7)
    private String secondaryColor;

    @Column(name = "logo_url", length = 500)
    private String logoUrl;

    @Column(name = "max_users")
    private Integer maxUsers;
}
