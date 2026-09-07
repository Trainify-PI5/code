package com.trainify.lms.repositories;

import com.trainify.lms.domain.entities.MediaAsset;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface MediaAssetRepository extends JpaRepository<MediaAsset, UUID> {
}
