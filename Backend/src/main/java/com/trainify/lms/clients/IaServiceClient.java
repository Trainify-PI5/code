package com.trainify.lms.clients;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.UUID;

@FeignClient(name = "ia-service", url = "http://localhost:8000/api/v1/media")
public interface IaServiceClient {

    @PostMapping("/transcribe")
    void triggerTranscription(@RequestBody TranscribeRequest request);

    @PostMapping("/chat")
    ChatResponse chat(@RequestBody ChatRequest request);

    class ChatRequest {
        public String query;
        public String tenant_id;
        public String course_id;

        public ChatRequest(String query, String tenantId, String courseId) {
            this.query = query;
            this.tenant_id = tenantId;
            this.course_id = courseId;
        }
    }

    class ChatResponse {
        public String response;
    }

    class TranscribeRequest {
        public String media_asset_id;
        public String s3_key;
        public String tenant_id;
        public String course_id;

        public TranscribeRequest(String mediaAssetId, String s3Key, String tenantId, String courseId) {
            this.media_asset_id = mediaAssetId;
            this.s3_key = s3Key;
            this.tenant_id = tenantId;
            this.course_id = courseId;
        }
    }
}
