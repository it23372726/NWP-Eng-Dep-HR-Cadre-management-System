package com.nwpengdep.hrms.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.nwpengdep.hrms.dto.EmployeeUpdateRequest;
import com.nwpengdep.hrms.entity.Designation;
import com.nwpengdep.hrms.entity.District;
import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.entity.EmployeeCareerProgression;
import com.nwpengdep.hrms.entity.EmployeeStatus;
import com.nwpengdep.hrms.entity.EmploymentType;
import com.nwpengdep.hrms.entity.Grade;
import com.nwpengdep.hrms.entity.ServiceLevel;
import com.nwpengdep.hrms.entity.ServiceType;
import com.nwpengdep.hrms.repository.DesignationRepository;
import com.nwpengdep.hrms.repository.EmployeeActionRepository;
import com.nwpengdep.hrms.repository.EmployeePostingRepository;
import com.nwpengdep.hrms.repository.EmployeeRepository;

class EmployeeServicePrivateVehicleTest {

    private EmployeeRepository employeeRepository;
    private EmployeeService employeeService;
    private Employee savedEmployee;

    @BeforeEach
    void setUp() {
        employeeRepository = mock(EmployeeRepository.class);
        DesignationRepository designationRepository = mock(DesignationRepository.class);
        EmployeeActionRepository employeeActionRepository =
                mock(EmployeeActionRepository.class);
        EmployeePostingRepository postingRepository =
                mock(EmployeePostingRepository.class);
        ServiceLevelService serviceLevelService = mock(ServiceLevelService.class);
        DesignationAssignmentValidator designationAssignmentValidator =
                mock(DesignationAssignmentValidator.class);
        EmployeeActionService employeeActionService =
                mock(EmployeeActionService.class);
        CareerProgressionService careerProgressionService =
                mock(CareerProgressionService.class);

        employeeService = new EmployeeService(
                employeeRepository,
                designationRepository,
                employeeActionRepository,
                postingRepository,
                serviceLevelService,
                designationAssignmentValidator,
                employeeActionService,
                careerProgressionService,
                new EmployeeRequirementSyncService(),
                new CareerHistoryValidator(
                        designationRepository,
                        new DesignationAssignmentValidator(),
                        careerProgressionService,
                        mock(OfficeService.class)
                ),
                mock(OfficeService.class)
        );

        ServiceType service = new ServiceType();
        service.setId(1L);

        Designation designation = new Designation();
        designation.setId(1L);
        designation.setService(service);
        designation.setAllowedGrades(EnumSet.of(
                Grade.III,
                Grade.II,
                Grade.I,
                Grade.SUPRA,
                Grade.SPECIAL
        ));

        ServiceLevel serviceLevel = new ServiceLevel();
        serviceLevel.setId(10L);
        serviceLevel.setLevelName("Primary");
        designation.setServiceLevel(serviceLevel);

        lenient().when(designationRepository.findById(1L))
                .thenReturn(Optional.of(designation));
        lenient().when(serviceLevelService.resolve(10L))
                .thenReturn(serviceLevel);
        lenient().when(careerProgressionService.ensureCareerProgression(any()))
                .thenAnswer(invocation -> {
                    Employee employee = invocation.getArgument(0);
                    if (employee.getCareerProgression() == null) {
                        EmployeeCareerProgression progression =
                                new EmployeeCareerProgression();
                        progression.setEmployee(employee);
                        employee.setCareerProgression(progression);
                    }
                    return employee.getCareerProgression();
                });
        lenient().when(employeeRepository.save(any())).thenAnswer(invocation -> {
            Employee employee = invocation.getArgument(0);
            employee.setId(1L);
            savedEmployee = employee;
            return employee;
        });
        lenient().when(employeeRepository.findById(anyLong()))
                .thenAnswer(invocation -> Optional.of(savedEmployee));

        savedEmployee = activePermanentEmployee();
    }

    @Test
    void savesPrivateVehicleDetailsWhenUsedForGovernmentWork() {
        EmployeeUpdateRequest request = baseUpdateRequest();
        request.setPrivateVehicleUsedForGovWork(true);
        request.setPrivateVehicleDescription("Toyota Hilux - WP ABC-1234");
        request.setPrivateVehiclePermissionDate(LocalDate.parse("2024-06-01"));

        Employee result = employeeService.updateEmployee(1L, request);

        assertEquals(true, result.getPrivateVehicleUsedForGovWork());
        assertEquals(
                "Toyota Hilux - WP ABC-1234",
                result.getPrivateVehicleDescription()
        );
        assertEquals(
                LocalDate.parse("2024-06-01"),
                result.getPrivateVehiclePermissionDate()
        );
    }

    @Test
    void rejectsPrivateVehicleWhenDescriptionMissing() {
        EmployeeUpdateRequest request = baseUpdateRequest();
        request.setPrivateVehicleUsedForGovWork(true);
        request.setPrivateVehiclePermissionDate(LocalDate.parse("2024-06-01"));

        assertThrows(
                IllegalArgumentException.class,
                () -> employeeService.updateEmployee(1L, request)
        );
    }

    @Test
    void rejectsPrivateVehicleWhenPermissionDateMissing() {
        EmployeeUpdateRequest request = baseUpdateRequest();
        request.setPrivateVehicleUsedForGovWork(true);
        request.setPrivateVehicleDescription("Toyota Hilux - WP ABC-1234");

        assertThrows(
                IllegalArgumentException.class,
                () -> employeeService.updateEmployee(1L, request)
        );
    }

    @Test
    void clearsPrivateVehicleDetailsWhenNotUsedForGovernmentWork() {
        savedEmployee.setPrivateVehicleUsedForGovWork(true);
        savedEmployee.setPrivateVehicleDescription("Toyota Hilux - WP ABC-1234");
        savedEmployee.setPrivateVehiclePermissionDate(LocalDate.parse("2024-06-01"));

        EmployeeUpdateRequest request = baseUpdateRequest();
        request.setPrivateVehicleUsedForGovWork(false);
        request.setPrivateVehicleDescription("Should be ignored");
        request.setPrivateVehiclePermissionDate(LocalDate.parse("2025-01-01"));

        Employee result = employeeService.updateEmployee(1L, request);

        assertEquals(false, result.getPrivateVehicleUsedForGovWork());
        assertNull(result.getPrivateVehicleDescription());
        assertNull(result.getPrivateVehiclePermissionDate());
    }

    private Employee activePermanentEmployee() {
        Employee employee = new Employee();
        employee.setId(1L);
        employee.setStatus(EmployeeStatus.ACTIVE);
        employee.setEmploymentType(EmploymentType.PERMANENT);
        employee.setDesignation(new Designation());
        employee.getDesignation().setId(1L);
        employee.setGrade(Grade.III);
        employee.setServiceLevel(new ServiceLevel());
        employee.getServiceLevel().setId(10L);
        employee.setDateOfFirstAppointment(LocalDate.parse("2015-01-01"));
        employee.setRequirements(new ArrayList<>());

        EmployeeCareerProgression progression = new EmployeeCareerProgression();
        progression.setEmployee(employee);
        employee.setCareerProgression(progression);

        return employee;
    }

    private EmployeeUpdateRequest baseUpdateRequest() {
        EmployeeUpdateRequest request = new EmployeeUpdateRequest();
        request.setEmployeeNo("EMP-001");
        request.setFullName("Test Employee");
        request.setDesignationId(1L);
        request.setNic("900000000V");
        request.setDateOfBirth(LocalDate.parse("1990-01-01"));
        request.setGender("Male");
        request.setGrade(Grade.III);
        request.setDateOfFirstAppointment(LocalDate.parse("2015-01-01"));
        request.setReportedDateToPresentWorkingPlace(LocalDate.parse("2020-01-01"));
        request.setCurrentWorkingPlace("Head Office");
        request.setCurrentDistrictOfWorking(District.KURUNEGALA);
        request.setEnteredDateToNWPCouncil(LocalDate.parse("2015-01-01"));
        request.setPermanentAddress("123 Main Street");
        request.setContactNo("0712345678");
        request.setServiceLevelId(10L);
        request.setEmploymentType(EmploymentType.PERMANENT);
        return request;
    }
}
