package com.nwpengdep.hrms.service;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;

import java.time.LocalDate;
import java.util.EnumSet;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;

import com.nwpengdep.hrms.dto.CareerHistoryEventRequest;
import com.nwpengdep.hrms.dto.EmployeeRequest;
import com.nwpengdep.hrms.dto.EmployeeUpdateRequest;
import com.nwpengdep.hrms.entity.Designation;
import com.nwpengdep.hrms.entity.District;
import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.entity.EmployeeActionType;
import com.nwpengdep.hrms.entity.EmployeeCareerProgression;
import com.nwpengdep.hrms.entity.EmployeeEntryType;
import com.nwpengdep.hrms.entity.EmployeeStatus;
import com.nwpengdep.hrms.entity.EmploymentType;
import com.nwpengdep.hrms.entity.Grade;
import com.nwpengdep.hrms.entity.ServiceLevel;
import com.nwpengdep.hrms.entity.ServiceType;
import com.nwpengdep.hrms.repository.DesignationRepository;
import com.nwpengdep.hrms.repository.EmployeeActionRepository;
import com.nwpengdep.hrms.repository.EmployeePostingRepository;
import com.nwpengdep.hrms.repository.EmployeeRepository;

class EmployeeServiceCareerHistoryTest {

    private EmployeeRepository employeeRepository;
    private DesignationRepository designationRepository;
    private EmployeeActionRepository employeeActionRepository;
    private EmployeePostingRepository postingRepository;
    private EmployeeActionService employeeActionService;
    private CareerProgressionService careerProgressionService;
    private EmployeeService employeeService;

    private Designation engineer;
    private Designation seniorEngineer;
    private ServiceLevel serviceLevel;

    @BeforeEach
    void setUp() {
        employeeRepository = mock(EmployeeRepository.class);
        designationRepository = mock(DesignationRepository.class);
        employeeActionRepository = mock(EmployeeActionRepository.class);
        postingRepository = mock(EmployeePostingRepository.class);
        ServiceLevelService serviceLevelService = mock(ServiceLevelService.class);
        DesignationAssignmentValidator designationAssignmentValidator =
                mock(DesignationAssignmentValidator.class);
        employeeActionService = mock(EmployeeActionService.class);
        careerProgressionService = mock(CareerProgressionService.class);
        EmployeeRequirementSyncService requirementSyncService =
                mock(EmployeeRequirementSyncService.class);

        employeeService = new EmployeeService(
                employeeRepository,
                designationRepository,
                employeeActionRepository,
                postingRepository,
                serviceLevelService,
                designationAssignmentValidator,
                employeeActionService,
                careerProgressionService,
                requirementSyncService,
                new CareerHistoryValidator(
                        designationRepository,
                        new DesignationAssignmentValidator()
                )
        );

        ServiceType service = new ServiceType();
        service.setId(1L);

        engineer = new Designation();
        engineer.setId(1L);
        engineer.setService(service);

        seniorEngineer = new Designation();
        seniorEngineer.setId(2L);
        seniorEngineer.setService(service);

        serviceLevel = new ServiceLevel();
        serviceLevel.setId(10L);
        serviceLevel.setLevelName("Primary");

        engineer.setServiceLevel(serviceLevel);
        engineer.setAllowedGrades(EnumSet.of(
                Grade.III,
                Grade.II,
                Grade.I,
                Grade.SUPRA,
                Grade.SPECIAL
        ));

        seniorEngineer.setServiceLevel(serviceLevel);
        seniorEngineer.setAllowedGrades(EnumSet.of(
                Grade.III,
                Grade.II,
                Grade.I,
                Grade.SUPRA,
                Grade.SPECIAL
        ));

        lenient().when(designationRepository.findById(1L))
                .thenReturn(Optional.of(engineer));
        lenient().when(designationRepository.findById(2L))
                .thenReturn(Optional.of(seniorEngineer));
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

    private Employee activePermanentEmployee() {
        Employee employee = new Employee();
        employee.setId(1L);
        employee.setStatus(EmployeeStatus.ACTIVE);
        employee.setEmploymentType(EmploymentType.PERMANENT);
        employee.setDesignation(engineer);
        employee.setGrade(Grade.III);
        employee.setServiceLevel(serviceLevel);
        employee.setDateOfFirstAppointment(LocalDate.parse("2015-01-01"));
        return employee;
    }

    private Employee savedEmployee;

    @Test
    void createsEmployeeAndRecordsFullCareerHistoryInOrder() {
        EmployeeRequest request = baseRequest();
        request.setCareerHistory(List.of(
                appointment("2015-01-01", 1L, 10L),
                event(EmployeeActionType.PERMANENT_CONFIRMATION, "2018-01-01"),
                promotion("2020-01-01", 2L, Grade.II)
        ));

        Employee result = employeeService.createEmployee(request);

        assertEquals(LocalDate.parse("2015-01-01"), result.getDateOfFirstAppointment());
        assertEquals(seniorEngineer, result.getDesignation());
        assertEquals(serviceLevel, result.getServiceLevel());

        InOrder order = inOrder(employeeActionService);
        order.verify(employeeActionService).recordActionWithGrades(
                any(Employee.class),
                eq(EmployeeActionType.NEW_APPOINTMENT),
                eq(LocalDate.parse("2015-01-01")),
                isNull(),
                eq(engineer),
                isNull(),
                eq(Grade.III),
                isNull(),
                isNull(),
                isNull(),
                isNull()
        );
        order.verify(employeeActionService).recordAction(
                any(Employee.class),
                eq(EmployeeActionType.PERMANENT_CONFIRMATION),
                eq(LocalDate.parse("2018-01-01")),
                isNull(),
                eq(engineer),
                isNull(),
                isNull(),
                isNull(),
                isNull()
        );
        order.verify(employeeActionService).recordActionWithGrades(
                any(Employee.class),
                eq(EmployeeActionType.PROMOTION),
                eq(LocalDate.parse("2020-01-01")),
                eq(engineer),
                eq(seniorEngineer),
                eq(Grade.III),
                eq(Grade.II),
                isNull(),
                isNull(),
                isNull(),
                isNull()
        );
        order.verify(employeeActionService).recalculateEmployeeState(1L);
    }

    @Test
    void rejectsCareerHistoryForNonPermanentEmployees() {
        EmployeeRequest request = baseRequest();
        request.setEmploymentType(EmploymentType.CASUAL);
        request.setCareerHistory(List.of(appointment("2015-01-01", 1L, 10L)));

        RuntimeException exception = assertThrows(
                RuntimeException.class,
                () -> employeeService.createEmployee(request)
        );
        assertTrue(exception.getMessage().contains("permanent"));
    }

    @Test
    void updatesEmployeeWithModifiedCareerHistory() {
        EmployeeUpdateRequest request = baseUpdateRequest();
        request.setDesignationId(2L);
        request.setCareerHistory(List.of(
                appointment("2015-01-01", 1L, 10L),
                event(EmployeeActionType.PERMANENT_CONFIRMATION, "2018-01-01"),
                promotion("2020-01-01", 2L, Grade.II)
        ));

        Employee result = employeeService.updateEmployee(1L, request);

        assertEquals(LocalDate.parse("2015-01-01"), result.getDateOfFirstAppointment());
        assertEquals(serviceLevel, result.getServiceLevel());

        InOrder order = inOrder(
                employeeActionRepository,
                postingRepository,
                employeeActionService
        );
        order.verify(employeeActionRepository).deleteByEmployeeId(1L);
        order.verify(postingRepository).deleteByEmployeeId(1L);
        order.verify(employeeActionService).recordActionWithGrades(
                any(Employee.class),
                eq(EmployeeActionType.NEW_APPOINTMENT),
                eq(LocalDate.parse("2015-01-01")),
                isNull(),
                eq(engineer),
                isNull(),
                eq(Grade.III),
                isNull(),
                isNull(),
                isNull(),
                isNull()
        );
        order.verify(employeeActionService).recalculateEmployeeState(1L);
    }

    @Test
    void allowsDesignationChangeThroughCareerHistoryUpdate() {
        EmployeeUpdateRequest request = baseUpdateRequest();
        request.setDesignationId(2L);
        request.setCareerHistory(List.of(
                appointment("2015-01-01", 1L, 10L),
                promotion("2020-01-01", 2L, Grade.II)
        ));

        assertDoesNotThrow(() -> employeeService.updateEmployee(1L, request));
    }

    @Test
    void rejectsTerminalEventInCareerHistoryUpdate() {
        EmployeeUpdateRequest request = baseUpdateRequest();
        request.setCareerHistory(List.of(
                appointment("2015-01-01", 1L, 10L),
                event(EmployeeActionType.RETIREMENT_OR_RESIGNATION, "2024-01-01")
        ));

        RuntimeException exception = assertThrows(
                RuntimeException.class,
                () -> employeeService.updateEmployee(1L, request)
        );
        assertTrue(exception.getMessage().contains("terminal"));
    }

    @Test
    void updatesNonPermanentEmployeeWithoutCareerHistory() {
        savedEmployee.setEmploymentType(EmploymentType.CASUAL);
        savedEmployee.setGrade(null);

        EmployeeUpdateRequest request = baseUpdateRequest();
        request.setEmploymentType(EmploymentType.CASUAL);
        request.setDesignationId(1L);
        request.setGrade(null);

        Employee result = employeeService.updateEmployee(1L, request);

        assertEquals(EmploymentType.CASUAL, result.getEmploymentType());
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

    private EmployeeRequest baseRequest() {
        EmployeeRequest request = new EmployeeRequest();
        request.setEntryType(EmployeeEntryType.NEW_EMPLOYEE);
        request.setEmployeeNo("EMP-001");
        request.setFullName("Test Employee");
        request.setDesignationId(2L);
        request.setNic("900000000V");
        request.setDateOfBirth(LocalDate.parse("1990-01-01"));
        request.setGender("Male");
        request.setGrade(Grade.II);
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

    private CareerHistoryEventRequest appointment(
            String date,
            Long designationId,
            Long serviceLevelId
    ) {
        CareerHistoryEventRequest event =
                event(EmployeeActionType.NEW_APPOINTMENT, date);
        event.setDesignationId(designationId);
        event.setServiceLevelId(serviceLevelId);
        return event;
    }

    private CareerHistoryEventRequest promotion(
            String date,
            Long designationId,
            Grade grade
    ) {
        CareerHistoryEventRequest event = event(EmployeeActionType.PROMOTION, date);
        event.setDesignationId(designationId);
        event.setGrade(grade);
        return event;
    }

    private CareerHistoryEventRequest event(EmployeeActionType type, String date) {
        CareerHistoryEventRequest event = new CareerHistoryEventRequest();
        event.setActionType(type);
        event.setActionDate(LocalDate.parse(date));
        return event;
    }
}
