package com.trainify.lms.repositories;

import com.trainify.lms.domain.entities.ForumThread;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface ForumThreadRepository extends JpaRepository<ForumThread, UUID> {
    Page<ForumThread> findByCourseIdOrderByCreatedAtDesc(UUID courseId, Pageable pageable);
}
