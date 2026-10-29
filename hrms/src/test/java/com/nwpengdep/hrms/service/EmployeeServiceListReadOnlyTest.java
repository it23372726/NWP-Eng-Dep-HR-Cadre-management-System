package com.nwpengdep.hrms.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.nwpengdep.hrms.constants.DepartmentConstants;
import com.nwpengdep.hrms.dto.EmployeeListItemResponse;
import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.entity.EmployeeStatus;
import com.nwpengdep.hrms.repository.DesignationRepository;
import com.nwpengdep.hrms.repository.EmployeeActionRepository;
import com.nwpengdep.hrms.repository.EmployeePostingRepository;
import com.nwpengdep.hrms.repository.EmployeeRepository;
import com.nwpengdep.hrms.repository.ServiceTypeRepository;

class EmployeeServiceListReadOnlyTest {

    private EmployeeRepository employeeRepository;
    private EmployeeActionRepository employeeActionRepository;
    private EmployeeService employeeService;

    @BeforeEach
    void setUp() {
        DepartmentConstants.setPrimaryDepartmentName("NWP Engineering");

        employeeRepository = mock(EmployeeRepository.class);
        DesignationRepository designationRepository = mock(DesignationRepository.class);
        employeeActionRepository = mock(EmployeeActionRepository.class);
        EmployeePostingRepository postingRepository =
                mock(EmployeePostingRepository.class);
        ServiceLevelService serviceLevelService = mock(ServiceLevelService.class);
        DesignationAssignmentValidator designationAssignmentValidator =
                mock(DesignationAssignmentValidator.class);
        EmployeeActionService employeeActionService =
                mock(EmployeeActionService.class);
        CareerProgressionService careerProgressionService =
                mock(CareerProgressionService.class);
        ServiceTypeRepository serviceTypeRepository =
                mock(ServiceTypeRepository.class);

        employeeService = new EmployeeService(
                employeeRepository,
                designationRepository,
                serviceTypeRepository,
                employeeActionRepository,
                postingRepository,
                serviceLevelService,
                designationAssignmentValidator,
                employeeActionService,
                careerProgressionService,
                new EmployeeRequirementSyncService(),
                new CareerHistoryValidator(
                        designationRepository,
                        serviceTypeRepository,
                        new DesignationAssignmentValidator(),
                        careerProgressionService,
                        mock(OfficeService.class)
                ),
                mock(OfficeService.class),
                new EmployeeServiceResolver(),
                mock(TrainingGraduationService.class)
        , mock(ServiceAppointmentService.class), mock(SalaryIncrementService.class));
    }

    @Test
    void activeListUsesListQueryAndDoesNotSave() {
        Employee employee = Employee.builder()
                .id(5L)
                .employeeNo("E005")
                .fullName("List Only")
                .status(EmployeeStatus.ACTIVE)
                .currentDepartment("NWP Engineering")
                .build();

        when(employeeRepository.findForListByStatus(EmployeeStatus.ACTIVE))
                .thenReturn(List.of(employee));
        when(employeeActionRepository.existsActiveActionsByEmployeeId(5L))
                .thenReturn(true);

        List<EmployeeListItemResponse> result =
                employeeService.getActiveEmployeesByScope("NWP");

        assertEquals(1, result.size());
        assertEquals(5L, result.get(0).getId());
        assertEquals("List Only", result.get(0).getFullName());

        verify(employeeRepository).findForListByStatus(EmployeeStatus.ACTIVE);
        verify(employeeRepository, never()).save(any());
        verify(employeeRepository, never()).saveAndFlush(any());
        verify(employeeRepository, never()).findById(any());
    }

    @Test
    void inactiveListUsesListQueryAndDoesNotSave() {
        Employee employee = Employee.builder()
                .id(9L)
                .employeeNo("E009")
                .fullName("Inactive Person")
                .status(EmployeeStatus.INACTIVE)
                .build();

        when(employeeRepository.findForListByStatus(EmployeeStatus.INACTIVE))
                .thenReturn(List.of(employee));

        List<EmployeeListItemResponse> result = employeeService.getInactiveEmployees();

        assertEquals(1, result.size());
        assertEquals(9L, result.get(0).getId());

        verify(employeeRepository).findForListByStatus(EmployeeStatus.INACTIVE);
        verify(employeeRepository, never()).save(any());
        verify(employeeRepository, never()).findById(any());
    }
}
