package com.trainify.lms.services;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.net.URL;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class S3ServiceTest {

    @Mock
    private S3Presigner s3Presigner;

    @Mock
    private S3Client s3Client;

    @InjectMocks
    private S3Service s3Service;

    @BeforeEach
    void setUp() {
        // Injeta a propriedade @Value usando ReflectionTestUtils
        ReflectionTestUtils.setField(s3Service, "bucketName", "test-bucket");
    }

    @Test
    void generatePresignedUploadUrl_Success_ReturnsUrlString() throws Exception {
        // Arrange
        String key = "videos/test.mp4";
        String contentType = "video/mp4";
        URL mockUrl = new URL("https://test-bucket.s3.amazonaws.com/videos/test.mp4?X-Amz-Signature=xyz");
        
        PresignedPutObjectRequest mockPresignedRequest = mock(PresignedPutObjectRequest.class);
        when(mockPresignedRequest.url()).thenReturn(mockUrl);
        when(s3Presigner.presignPutObject(any(PutObjectPresignRequest.class))).thenReturn(mockPresignedRequest);

        // Act
        String result = s3Service.generatePresignedUploadUrl(key, contentType);

        // Assert
        assertNotNull(result);
        assertEquals(mockUrl.toString(), result);
        verify(s3Presigner).presignPutObject(any(PutObjectPresignRequest.class));
    }

    @Test
    void generatePresignedDownloadUrl_Success_ReturnsUrlString() throws Exception {
        // Arrange
        String key = "videos/test.mp4";
        URL mockUrl = new URL("https://test-bucket.s3.amazonaws.com/videos/test.mp4?X-Amz-Signature=abc");
        
        PresignedGetObjectRequest mockPresignedRequest = mock(PresignedGetObjectRequest.class);
        when(mockPresignedRequest.url()).thenReturn(mockUrl);
        when(s3Presigner.presignGetObject(any(GetObjectPresignRequest.class))).thenReturn(mockPresignedRequest);

        // Act
        String result = s3Service.generatePresignedDownloadUrl(key);

        // Assert
        assertNotNull(result);
        assertEquals(mockUrl.toString(), result);
        verify(s3Presigner).presignGetObject(any(GetObjectPresignRequest.class));
    }

    @Test
    void deleteFileAsync_Success_CallsS3Client() {
        // Arrange
        String key = "videos/test.mp4";

        // Act
        s3Service.deleteFileAsync(key);

        // Assert
        verify(s3Client).deleteObject(any(DeleteObjectRequest.class));
    }
}
