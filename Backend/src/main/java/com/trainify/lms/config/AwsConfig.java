package com.trainify.lms.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

import java.net.URI;

@Configuration
public class AwsConfig {

    @Value("${app.s3.access-key:mockAccessKey}")
    private String accessKeyId;

    @Value("${app.s3.secret-key:mockSecretKey}")
    private String secretAccessKey;

    @Value("${app.s3.region:us-east-1}")
    private String region;

    @Value("${app.s3.endpoint:#{null}}")
    private String endpointOverride;

    // Supabase Storage e MinIO so aceitam URLs no formato endpoint/bucket/chave
    @Value("${app.s3.path-style:true}")
    private boolean pathStyle;

    @Bean
    public S3Client s3Client() {
        var builder = S3Client.builder()
                .region(Region.of(region))
                .credentialsProvider(credentials())
                .serviceConfiguration(s3Configuration());

        if (endpointOverride != null && !endpointOverride.isBlank()) {
            builder.endpointOverride(URI.create(endpointOverride));
        }

        return builder.build();
    }

    @Bean
    public S3Presigner s3Presigner() {
        var builder = S3Presigner.builder()
                .region(Region.of(region))
                .credentialsProvider(credentials())
                .serviceConfiguration(s3Configuration());

        if (endpointOverride != null && !endpointOverride.isBlank()) {
            builder.endpointOverride(URI.create(endpointOverride));
        }

        return builder.build();
    }

    private StaticCredentialsProvider credentials() {
        return StaticCredentialsProvider.create(AwsBasicCredentials.create(accessKeyId, secretAccessKey));
    }

    private S3Configuration s3Configuration() {
        return S3Configuration.builder()
                .pathStyleAccessEnabled(pathStyle)
                .build();
    }
}
