package com.trainify.lms.repositories;

import com.trainify.lms.domain.entities.Certification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CertificationRepository extends JpaRepository<Certification, UUID> {
    List<Certification> findByUserId(UUID userId);
}
