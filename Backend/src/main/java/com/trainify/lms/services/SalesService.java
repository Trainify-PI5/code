package com.trainify.lms.services;

import com.trainify.lms.dto.SalesRequest;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SalesService {
    private final JdbcTemplate jdbc;

    public enum Status { NEW, CONTACTED, CLOSED }
    public record Lead(UUID id, String firstName, String lastName, String email, String phone,
                       String company, String jobTitle, String companySize, String message,
                       Status status, Instant createdAt) {}
    public record Page(List<Lead> items, long total, int page) {}

    @Transactional
    public UUID create(SalesRequest request) {
        jdbc.update("""
                INSERT INTO sales_leads (id, first_name, last_name, email, phone, company, job_title,
                    company_size, message, consent_at, consent_version)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 'sales-contact-v1')
                ON CONFLICT (id) DO NOTHING
                """, request.id(), request.firstName(), request.lastName(), request.email(), request.phone(),
                request.company(), request.jobTitle(), request.companySize(), request.message());
        return request.id();
    }

    @Transactional(readOnly = true)
    public Page list(int page) {
        var leads = jdbc.query("SELECT * FROM sales_leads ORDER BY created_at DESC, id LIMIT 20 OFFSET ?",
                (rs, index) -> new Lead(rs.getObject("id", UUID.class), rs.getString("first_name"),
                        rs.getString("last_name"), rs.getString("email"), rs.getString("phone"),
                        rs.getString("company"), rs.getString("job_title"), rs.getString("company_size"),
                        rs.getString("message"), Status.valueOf(rs.getString("status")),
                        rs.getTimestamp("created_at").toInstant()), (long) page * 20);
        return new Page(leads, jdbc.queryForObject("SELECT COUNT(*) FROM sales_leads", Long.class), page);
    }

    @Transactional
    public void updateStatus(UUID id, Status status) {
        if (jdbc.update("UPDATE sales_leads SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                status.name(), id) == 0) throw new EntityNotFoundException("Solicitação não encontrada.");
    }
}
