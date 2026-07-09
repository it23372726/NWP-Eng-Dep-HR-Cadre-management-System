package com.nwpengdep.hrms.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.nwpengdep.hrms.constants.DepartmentConstants;
import com.nwpengdep.hrms.dto.EmployeeRequest;
import com.nwpengdep.hrms.entity.Designation;
import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.entity.EmployeeEntryType;
import com.nwpengdep.hrms.entity.EmploymentType;
import com.nwpengdep.hrms.entity.Grade;
import com.nwpengdep.hrms.repository.DesignationRepository;
import com.nwpengdep.hrms.repository.EmployeeActionRepository;
import com.nwpengdep.hrms.repository.EmployeePostingRepository;
import com.nwpengdep.hrms.repository.EmployeeRepository;
import com.nwpengdep.hrms.repository.ServiceTypeRepository;

class EmployeeServiceContractTest {

    private EmployeeRepository employeeRepository;
    private DesignationRepository designationRepository;
    private OfficeService officeService;
    private EmployeeService employeeService;

    @BeforeEach
    void setUp() {
        employeeRepository = mock(EmployeeRepository.class);
        designationRepository = mock(DesignationRepository.class);
        EmployeeActionRepository employeeActionRepository =
                mock(EmployeeActionRepository.class);
        EmployeePostingRepository postingRepository =
                mock(EmployeePostingRepository.class);
        ServiceLevelService serviceLevelService = mock(ServiceLevelService.class);
        EmployeeActionService employeeActionService =
                mock(EmployeeActionService.class);
        CareerProgressionService careerProgressionService =
                mock(CareerProgressionService.class);
        officeService = mock(OfficeService.class);

        ServiceTypeRepository serviceTypeRepository =
                mock(ServiceTypeRepository.class);

        employeeService = new EmployeeService(
                employeeRepository,
                designationRepository,
                serviceTypeRepository,
                employeeActionRepository,
                postingRepository,
                serviceLevelService,
                new DesignationAssignmentValidator(),
                employeeActionService,
                careerProgressionService,
                new EmployeeRequirementSyncService(),
                new CareerHistoryValidator(
                        designationRepository,
                        serviceTypeRepository,
                        new DesignationAssignmentValidator(),
                        careerProgressionService,
                        officeService
                ),
                officeService,
                new EmployeeServiceResolver(),
                mock(TrainingGraduationService.class)
        );

        Designation designation = new Designation();
        designation.setId(1L);
        when(designationRepository.findById(1L)).thenReturn(Optional.of(designation));
        when(employeeRepository.save(any(Employee.class))).thenAnswer(invocation -> {
            Employee employee = invocation.getArgument(0);
            employee.setId(10L);
            return employee;
        });
    }

    @Test
    void createContractEmployeeStoresContractFieldsWithoutServiceLevel() {
        Employee created = employeeService.createEmployee(validContractRequest());

        assertEquals(EmploymentType.CONTRACT, created.getEmploymentType());
        assertEquals(Grade.NONE, created.getGrade());
        assertNull(created.getServiceLevel());
        assertNull(created.getDateOfFirstAppointment());
        assertEquals(LocalDate.of(2026, 1, 1), created.getContractStartDate());
        assertEquals(LocalDate.of(2026, 12, 31), created.getContractEndDate());
        assertEquals(
                DepartmentConstants.NWP_ENGINEERING,
                created.getCurrentDepartment()
        );
        assertEquals("Main Office", created.getCurrentOffice());
    }

    @Test
    void createContractEmployeeRequiresContractEndDate() {
        EmployeeRequest request = validContractRequest();
        request.setContractEndDate(null);

        RuntimeException error = assertThrows(
                RuntimeException.class,
                () -> employeeService.createEmployee(request)
        );

        assertEquals("Contract end date is required", error.getMessage());
    }

    private EmployeeRequest validContractRequest() {
        EmployeeRequest request = new EmployeeRequest();
        request.setEntryType(EmployeeEntryType.NEW_EMPLOYEE);
        request.setEmployeeNo("9001");
        request.setFullName("Contract Staff");
        request.setDesignationId(1L);
        request.setNic("900000000V");
        request.setDateOfBirth(LocalDate.of(1990, 5, 5));
        request.setGender("Male");
        request.setMaritalStatus("Single");
        request.setReportedDateToPresentWorkingPlace(LocalDate.of(2026, 1, 15));
        request.setCurrentWorkingPlace("Main Office");
        request.setCurrentDepartment(DepartmentConstants.NWP_ENGINEERING);
        request.setCurrentDistrictOfWorking("Kurunegala");
        request.setEnteredDateToNWPCouncil(LocalDate.of(2026, 1, 10));
        request.setContractStartDate(LocalDate.of(2026, 1, 1));
        request.setContractEndDate(LocalDate.of(2026, 12, 31));
        request.setPermanentAddress("123 Main St");
        request.setContactNo("0771234567");
        request.setEmploymentType(EmploymentType.CONTRACT);
        request.setPrivateVehicleUsedForGovWork(false);
        return request;
    }
}
