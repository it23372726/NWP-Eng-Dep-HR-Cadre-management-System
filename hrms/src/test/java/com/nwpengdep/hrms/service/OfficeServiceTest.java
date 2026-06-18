package com.nwpengdep.hrms.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
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
import com.nwpengdep.hrms.entity.District;
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

    @InjectMocks
    private OfficeService officeService;

    private OfficeRequest request;

    @BeforeEach
    void setUp() {
        request = new OfficeRequest();
        request.setName("District Office");
        request.setDistrict(District.KURUNEGALA);
    }

    @Test
    void createPersistsOffice() {
        when(officeRepository.existsByNameIgnoreCaseAndDistrict(
                "District Office",
                District.KURUNEGALA
        )).thenReturn(false);
        when(officeRepository.save(any(Office.class))).thenAnswer(invocation -> {
            Office office = invocation.getArgument(0);
            office.setId(1L);
            return office;
        });

        Office created = officeService.create(request);

        assertEquals("District Office", created.getName());
        assertEquals(District.KURUNEGALA, created.getDistrict());
    }

    @Test
    void createRejectsDuplicateNameInDistrict() {
        when(officeRepository.existsByNameIgnoreCaseAndDistrict(
                "District Office",
                District.KURUNEGALA
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
                .district(District.KURUNEGALA)
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
        when(officeRepository.findByNameIgnoreCaseAndDistrict(
                "Unknown Office",
                District.PUTTALAM
        )).thenReturn(Optional.empty());

        RuntimeException exception = assertThrows(
                RuntimeException.class,
                () -> officeService.validateNwpWorkplace("Unknown Office", District.PUTTALAM)
        );

        assertTrue(exception.getMessage().contains("not registered"));
    }

    @Test
    void validateNwpWorkplacePassesForRegisteredOffice() {
        when(officeRepository.findByNameIgnoreCaseAndDistrict(
                "District Office",
                District.KURUNEGALA
        )).thenReturn(Optional.of(Office.builder()
                .name("District Office")
                .district(District.KURUNEGALA)
                .build()));

        officeService.validateNwpWorkplace("District Office", District.KURUNEGALA);

        verify(officeRepository).findByNameIgnoreCaseAndDistrict(
                "District Office",
                District.KURUNEGALA
        );
    }

    @Test
    void getAllCanFilterByDistrict() {
        when(officeRepository.findByDistrictOrderByNameAsc(District.KURUNEGALA))
                .thenReturn(List.of());

        officeService.getAll(District.KURUNEGALA);

        verify(officeRepository).findByDistrictOrderByNameAsc(eq(District.KURUNEGALA));
    }
}
