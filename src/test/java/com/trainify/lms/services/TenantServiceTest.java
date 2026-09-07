package com.trainify.lms.services;

import com.trainify.lms.domain.entities.Tenant;
import com.trainify.lms.dto.CreateTenantRequest;
import com.trainify.lms.dto.TenantDto;
import com.trainify.lms.dto.UpdateTenantRequest;
import com.trainify.lms.repositories.TenantRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class TenantServiceTest {

    @Mock
    private TenantRepository tenantRepository;

    @InjectMocks
    private TenantService tenantService;

    private Tenant mockTenant;
    private UUID tenantId;

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        mockTenant = new Tenant();
        mockTenant.setId(tenantId);
        mockTenant.setName("Old Name");
        mockTenant.setDomain("old.com");
    }

    @Test
    void getAllTenants_Success_ReturnsList() {
        // Arrange
        when(tenantRepository.findAll()).thenReturn(List.of(mockTenant));

        // Act
        List<TenantDto> result = tenantService.getAllTenants();

        // Assert
        assertEquals(1, result.size());
        assertEquals("Old Name", result.get(0).getName());
        verify(tenantRepository).findAll();
    }

    @Test
    void getTenantById_Success_ReturnsTenant() {
        // Arrange
        when(tenantRepository.findById(tenantId)).thenReturn(Optional.of(mockTenant));

        // Act
        TenantDto result = tenantService.getTenantById(tenantId);

        // Assert
        assertNotNull(result);
        assertEquals(tenantId, result.getId());
        verify(tenantRepository).findById(tenantId);
    }

    @Test
    void getTenantById_NotFound_ThrowsException() {
        // Arrange
        when(tenantRepository.findById(tenantId)).thenReturn(Optional.empty());

        // Act & Assert
        EntityNotFoundException exception = assertThrows(EntityNotFoundException.class, () -> 
            tenantService.getTenantById(tenantId)
        );
        assertEquals("Tenant not found", exception.getMessage());
    }

    @Test
    void createTenant_Success_ReturnsNewTenant() {
        // Arrange
        CreateTenantRequest request = new CreateTenantRequest();
        request.setName("New Tenant");
        request.setDomain("new.com");
        
        when(tenantRepository.save(any(Tenant.class))).thenAnswer(i -> {
            Tenant t = i.getArgument(0);
            t.setId(UUID.randomUUID());
            return t;
        });

        // Act
        TenantDto result = tenantService.createTenant(request);

        // Assert
        assertNotNull(result);
        assertEquals("New Tenant", result.getName());
        assertEquals("new.com", result.getDomain());
        verify(tenantRepository).save(any(Tenant.class));
    }

    @Test
    void updateTenant_Success_UpdatesAndReturns() {
        // Arrange
        UpdateTenantRequest request = new UpdateTenantRequest();
        request.setName("Updated Name");
        request.setDomain("updated.com");
        request.setPrimaryColor("#000");

        when(tenantRepository.findById(tenantId)).thenReturn(Optional.of(mockTenant));
        when(tenantRepository.save(any(Tenant.class))).thenAnswer(i -> i.getArgument(0));

        // Act
        TenantDto result = tenantService.updateTenant(tenantId, request);

        // Assert
        assertEquals("Updated Name", result.getName());
        assertEquals("updated.com", result.getDomain());
        assertEquals("#000", result.getPrimaryColor());
        verify(tenantRepository).findById(tenantId);
        verify(tenantRepository).save(any(Tenant.class));
    }
}
