package com.trainify.lms.domain.listeners;

import com.trainify.lms.domain.entities.MediaAsset;
import com.trainify.lms.services.S3Service;
import jakarta.persistence.PostRemove;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class MediaAssetListener {

    private static S3Service s3Service;

    @Autowired
    public void setS3Service(S3Service s3Service) {
        MediaAssetListener.s3Service = s3Service;
    }

    @PostRemove
    public void onPostRemove(MediaAsset mediaAsset) {
        if (mediaAsset.getS3Key() != null && s3Service != null) {
            s3Service.deleteFileAsync(mediaAsset.getS3Key());
        }
    }
}
