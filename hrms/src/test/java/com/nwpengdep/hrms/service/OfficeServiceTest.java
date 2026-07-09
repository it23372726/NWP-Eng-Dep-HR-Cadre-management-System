package com.nwpengdep.hrms.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.nwpengdep.hrms.dto.OfficeRequest;
import com.nwpengdep.hrms.entity.EmployeeStatus;
import com.nwpengdep.hrms.entity.Office;
import com.nwpengdep.hrms.repository.EmployeeRepository;
import com.nwpengdep.hrms.repository.OfficeRepository;

@ExtendWith(MockitoExtension.class)
class OfficeServiceTest {

    @Mock
    private OfficeRepository officeRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private OrganizationSettingsService organizationSettingsService;

    @InjectMocks
    private OfficeService officeService;

    private OfficeRequest request;

    @BeforeEach
    void setUp() {
        request = new OfficeRequest();
        request.setName("District Office");
        request.setDistrict("Kurunegala");
    }

    @Test
    void createPersistsOffice() {
        doNothing().when(organizationSettingsService)
                .requireConfiguredDistrict("Kurunegala");
        when(organizationSettingsService.normalizeDistrictLabel("Kurunegala"))
                .thenReturn("Kurunegala");
        when(officeRepository.existsByNameIgnoreCaseAndDistrictIgnoreCase(
                "District Office",
                "Kurunegala"
        )).thenReturn(false);
        when(officeRepository.save(any(Office.class))).thenAnswer(invocation -> {
            Office office = invocation.getArgument(0);
            office.setId(1L);
            return office;
        });

        Office created = officeService.create(request);

        assertEquals("District Office", created.getName());
        assertEquals("Kurunegala", created.getDistrict());
    }

    @Test
    void createRejectsDuplicateNameInDistrict() {
        doNothing().when(organizationSettingsService)
                .requireConfiguredDistrict("Kurunegala");
        when(organizationSettingsService.normalizeDistrictLabel("Kurunegala"))
                .thenReturn("Kurunegala");
        when(officeRepository.existsByNameIgnoreCaseAndDistrictIgnoreCase(
                "District Office",
                "Kurunegala"
        )).thenReturn(true);

        RuntimeException exception = assertThrows(
                RuntimeException.class,
                () -> officeService.create(request)
        );

        assertTrue(exception.getMessage().contains("already exists"));
    }

    @Test
    void deleteRejectsWhenActiveEmployeesAssigned() {
        Office office = Office.builder()
                .id(1L)
                .name("District Office")
                .district("Kurunegala")
                .build();

        when(officeRepository.findById(1L)).thenReturn(Optional.of(office));
        when(employeeRepository.countByCurrentOfficeIgnoreCaseAndStatus(
                "District Office",
                EmployeeStatus.ACTIVE
        )).thenReturn(2L);

        RuntimeException exception = assertThrows(
                RuntimeException.class,
                () -> officeService.delete(1L)
        );

        assertTrue(exception.getMessage().contains("Cannot delete"));
    }

    @Test
    void validateNwpWorkplaceRequiresRegisteredOffice() {
        doNothing().when(organizationSettingsService)
                .requireConfiguredDistrict("Puttalam");
        when(organizationSettingsService.normalizeDistrictLabel("Puttalam"))
                .thenReturn("Puttalam");
        when(officeRepository.findByNameIgnoreCaseAndDistrictIgnoreCase(
                "Unknown Office",
                "Puttalam"
        )).thenReturn(Optional.empty());

        RuntimeException exception = assertThrows(
                RuntimeException.class,
                () -> officeService.validateNwpWorkplace("Unknown Office", "Puttalam")
        );

        assertTrue(exception.getMessage().contains("not registered"));
    }

    @Test
    void validateNwpWorkplacePassesForRegisteredOffice() {
        doNothing().when(organizationSettingsService)
                .requireConfiguredDistrict("Kurunegala");
        when(organizationSettingsService.normalizeDistrictLabel("Kurunegala"))
                .thenReturn("Kurunegala");
        when(officeRepository.findByNameIgnoreCaseAndDistrictIgnoreCase(
                "District Office",
                "Kurunegala"
        )).thenReturn(Optional.of(Office.builder()
                .name("District Office")
                .district("Kurunegala")
                .build()));

        officeService.validateNwpWorkplace("District Office", "Kurunegala");

        verify(officeRepository).findByNameIgnoreCaseAndDistrictIgnoreCase(
                "District Office",
                "Kurunegala"
        );
    }

    @Test
    void getAllCanFilterByDistrict() {
        when(organizationSettingsService.normalizeDistrictLabel("Kurunegala"))
                .thenReturn("Kurunegala");
        when(officeRepository.findByDistrictIgnoreCaseOrderByNameAsc("Kurunegala"))
                .thenReturn(List.of());

        officeService.getAll("Kurunegala");

        verify(officeRepository).findByDistrictIgnoreCaseOrderByNameAsc(eq("Kurunegala"));
    }
}
