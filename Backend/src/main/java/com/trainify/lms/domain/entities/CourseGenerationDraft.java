package com.trainify.lms.domain.entities;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/**
 * Curso proposto pela IA a partir dos documentos do instrutor. Fica aqui ate o
 * instrutor revisar e aprovar (vira um curso em rascunho) ou descartar.
 */
@Entity
@Table(name = "course_generation_drafts")
@Getter
@Setter
public class CourseGenerationDraft extends BaseEntity {

    public enum Status { PROCESSING, READY, FAILED, APPROVED, DISCARDED }

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "created_by", nullable = false)
    private UUID createdBy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status = Status.PROCESSING;

    @Column(nullable = false)
    private Integer progress = 0;

    @Column(length = 300)
    private String step;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "document_names", columnDefinition = "jsonb")
    private List<String> documentNames;

    @Column(length = 500)
    private String instructions;

    /** Proposta da IA (titulo, modulos, aulas e fontes), ja com as edicoes do instrutor. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> proposal;

    @Column(length = 500)
    private String error;

    /** Curso criado na aprovacao. */
    @Column(name = "course_id")
    private UUID courseId;
}
