package com.trainify.lms.repositories;

import com.trainify.lms.domain.entities.ForumPost;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ForumPostRepository extends JpaRepository<ForumPost, UUID> {
    List<ForumPost> findByThreadIdOrderByCreatedAtAsc(UUID threadId);
}
