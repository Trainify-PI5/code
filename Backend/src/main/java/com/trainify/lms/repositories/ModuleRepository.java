package com.trainify.lms.repositories;

import com.trainify.lms.domain.entities.Module;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ModuleRepository extends JpaRepository<Module, UUID> {
    List<Module> findByCourseIdOrderByOrderIndexAsc(UUID courseId);
}
