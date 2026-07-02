package com.nwpengdep.hrms.service;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import java.util.EnumSet;
import java.util.Set;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.nwpengdep.hrms.dto.ServiceTypeRequest;
import com.nwpengdep.hrms.entity.Grade;
import com.nwpengdep.hrms.repository.EmployeeRepository;
import com.nwpengdep.hrms.repository.ServiceTypeRepository;

@ExtendWith(MockitoExtension.class)
class ServiceTypeServiceTest {

    @Mock
    private ServiceTypeRepository serviceTypeRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private CareerProgressionService careerProgressionService;

    @Mock
    private EmployeeRequirementSyncService requirementSyncService;

    @InjectMocks
    private ServiceTypeService serviceTypeService;

    @Test
    void rejectsServiceWithBothSupraAndSpecial() {
        ServiceTypeRequest request = new ServiceTypeRequest();
        request.setServiceCode("TEST");
        request.setDescription("Test service");
        request.setAllowedGrades(Set.of(Grade.I, Grade.SUPRA, Grade.SPECIAL));

        RuntimeException exception = assertThrows(
                RuntimeException.class,
                () -> serviceTypeService.createService(request)
        );

        assertTrue(exception.getMessage().contains("cannot allow both Supra and Special"));
    }

    @Test
    void allowsServiceWithSupraOnly() {
        ServiceTypeRequest request = new ServiceTypeRequest();
        request.setServiceCode("SUPRA");
        request.setDescription("Supra path");
        request.setAllowedGrades(EnumSet.of(Grade.III, Grade.II, Grade.I, Grade.SUPRA));
        request.setSupraRequiredYears(2);

        when(serviceTypeRepository.save(any()))
                .thenAnswer(invocation -> invocation.getArgument(0));

        serviceTypeService.createService(request);
    }
}
