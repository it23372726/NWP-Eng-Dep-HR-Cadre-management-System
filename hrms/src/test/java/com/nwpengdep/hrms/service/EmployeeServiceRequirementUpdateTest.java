package com.nwpengdep.hrms.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.nwpengdep.hrms.dto.EmployeeRequirementRequest;
import com.nwpengdep.hrms.dto.EmployeeUpdateRequest;
import com.nwpengdep.hrms.entity.Designation;
import com.nwpengdep.hrms.entity.District;
import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.entity.EmployeeCareerProgression;
import com.nwpengdep.hrms.entity.EmployeeRequirement;
import com.nwpengdep.hrms.entity.EmployeeStatus;
import com.nwpengdep.hrms.entity.EmploymentType;
import com.nwpengdep.hrms.entity.Grade;
import com.nwpengdep.hrms.entity.RequirementStatus;
import com.nwpengdep.hrms.entity.RequirementType;
import com.nwpengdep.hrms.entity.ServiceLevel;
import com.nwpengdep.hrms.entity.ServiceType;
import com.nwpengdep.hrms.repository.DesignationRepository;
import com.nwpengdep.hrms.repository.EmployeeActionRepository;
import com.nwpengdep.hrms.repository.EmployeePostingRepository;
import com.nwpengdep.hrms.repository.EmployeeRepository;

class EmployeeServiceRequirementUpdateTest {

    private EmployeeRepository employeeRepository;
    private DesignationRepository designationRepository;
    private EmployeeService employeeService;
    private Employee savedEmployee;
    private Designation designation;

    @BeforeEach
    void setUp() {
        employeeRepository = mock(EmployeeRepository.class);
        designationRepository = mock(DesignationRepository.class);
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
        EmployeeRequirementSyncService requirementSyncService =
                new EmployeeRequirementSyncService();

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
                        new DesignationAssignmentValidator(),
                        careerProgressionService,
                        mock(OfficeService.class)
                ),
                mock(OfficeService.class)
        );

        ServiceType service = new ServiceType();
        service.setId(1L);

        designation = new Designation();
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
    void allowsGradeThreeProbationEmployeeToUnsetCompletedPermanentRequirement() {
        savedEmployee.getRequirements().add(completedRequirement(
                RequirementType.EB_GRADE_3
        ));

        EmployeeUpdateRequest request = baseUpdateRequest();
        request.setRequirements(List.of(
                requirementRequest(
                        RequirementType.EB_GRADE_3,
                        RequirementStatus.PENDING
                )
        ));

        Employee result = employeeService.updateEmployee(1L, request);

        assertEquals(
                RequirementStatus.PENDING,
                findRequirement(result, RequirementType.EB_GRADE_3).getStatus()
        );
    }

    @Test
    void preservesCompletedPermanentRequirementForConfirmedGradeThreeEmployee() {
        savedEmployee.getCareerProgression().setPermanentConfirmationDate(
                LocalDate.parse("2018-01-01")
        );
        savedEmployee.getRequirements().add(completedRequirement(
                RequirementType.EB_GRADE_3
        ));

        EmployeeUpdateRequest request = baseUpdateRequest();
        request.setRequirements(List.of(
                requirementRequest(
                        RequirementType.EB_GRADE_3,
                        RequirementStatus.PENDING
                )
        ));

        Employee result = employeeService.updateEmployee(1L, request);

        assertEquals(
                RequirementStatus.COMPLETED,
                findRequirement(result, RequirementType.EB_GRADE_3).getStatus()
        );
    }

    @Test
    void allowsPendingRequirementToBecomeCompleted() {
        savedEmployee.getRequirements().add(pendingRequirement(
                RequirementType.EB_GRADE_3
        ));

        EmployeeUpdateRequest request = baseUpdateRequest();
        request.setRequirements(List.of(
                requirementRequest(
                        RequirementType.EB_GRADE_3,
                        RequirementStatus.COMPLETED
                )
        ));

        Employee result = employeeService.updateEmployee(1L, request);

        assertEquals(
                RequirementStatus.COMPLETED,
                findRequirement(result, RequirementType.EB_GRADE_3).getStatus()
        );
    }

    @Test
    void qualificationUpdateOnlySkipsGradeDerivedAutoCompletion() {
        savedEmployee.setGrade(Grade.II);
        savedEmployee.getRequirements().add(completedRequirement(
                RequirementType.EB_GRADE_3
        ));
        savedEmployee.getRequirements().add(pendingRequirement(
                RequirementType.GOVERNMENT_LANGUAGE_QUALIFICATION
        ));

        EmployeeUpdateRequest request = baseUpdateRequest();
        request.setGrade(Grade.II);
        request.setQualificationUpdateOnly(true);
        request.setRequirements(List.of(
                requirementRequest(
                        RequirementType.EB_GRADE_3,
                        RequirementStatus.COMPLETED
                ),
                requirementRequest(
                        RequirementType.GOVERNMENT_LANGUAGE_QUALIFICATION,
                        RequirementStatus.PENDING
                )
        ));

        Employee result = employeeService.updateEmployee(1L, request);

        assertEquals(
                RequirementStatus.PENDING,
                findRequirement(
                        result,
                        RequirementType.GOVERNMENT_LANGUAGE_QUALIFICATION
                ).getStatus()
        );
    }

    @Test
    void allowsGradeTwoEmployeeToUnsetCompletedGradeOneRequirement() {
        savedEmployee.setGrade(Grade.II);
        savedEmployee.getRequirements().add(completedRequirement(
                RequirementType.EB_GRADE_1
        ));

        EmployeeUpdateRequest request = baseUpdateRequest();
        request.setGrade(Grade.II);
        request.setRequirements(List.of(
                requirementRequest(
                        RequirementType.EB_GRADE_1,
                        RequirementStatus.PENDING
                )
        ));

        Employee result = employeeService.updateEmployee(1L, request);

        assertEquals(
                RequirementStatus.PENDING,
                findRequirement(result, RequirementType.EB_GRADE_1).getStatus()
        );
    }

    @Test
    void preservesCompletedPermanentRequirementForGradeTwoEmployee() {
        savedEmployee.setGrade(Grade.II);
        savedEmployee.getRequirements().add(completedRequirement(
                RequirementType.EB_GRADE_3
        ));

        EmployeeUpdateRequest request = baseUpdateRequest();
        request.setGrade(Grade.II);
        request.setRequirements(List.of(
                requirementRequest(
                        RequirementType.EB_GRADE_3,
                        RequirementStatus.PENDING
                )
        ));

        Employee result = employeeService.updateEmployee(1L, request);

        assertEquals(
                RequirementStatus.COMPLETED,
                findRequirement(result, RequirementType.EB_GRADE_3).getStatus()
        );
    }

    private Employee activePermanentEmployee() {
        Employee employee = new Employee();
        employee.setId(1L);
        employee.setStatus(EmployeeStatus.ACTIVE);
        employee.setEmploymentType(EmploymentType.PERMANENT);
        employee.setDesignation(designation);
        employee.setGrade(Grade.III);
        employee.setServiceLevel(designation.getServiceLevel());
        employee.setDateOfFirstAppointment(LocalDate.parse("2015-01-01"));
        employee.setRequirements(new ArrayList<>());

        EmployeeCareerProgression progression = new EmployeeCareerProgression();
        progression.setEmployee(employee);
        employee.setCareerProgression(progression);

        return employee;
    }

    private EmployeeRequirement completedRequirement(RequirementType type) {
        EmployeeRequirement requirement = new EmployeeRequirement();
        requirement.setId(1L);
        requirement.setEmployee(savedEmployee);
        requirement.setRequirementType(type);
        requirement.setStatus(RequirementStatus.COMPLETED);
        requirement.setCompletedDate(LocalDate.parse("2020-01-01"));
        return requirement;
    }

    private EmployeeRequirement pendingRequirement(RequirementType type) {
        EmployeeRequirement requirement = new EmployeeRequirement();
        requirement.setId(2L);
        requirement.setEmployee(savedEmployee);
        requirement.setRequirementType(type);
        requirement.setStatus(RequirementStatus.PENDING);
        return requirement;
    }

    private EmployeeRequirementRequest requirementRequest(
            RequirementType type,
            RequirementStatus status
    ) {
        EmployeeRequirementRequest request = new EmployeeRequirementRequest();
        request.setRequirementType(type);
        request.setStatus(status);
        return request;
    }

    private EmployeeRequirement findRequirement(
            Employee employee,
            RequirementType type
    ) {
        return employee.getRequirements()
                .stream()
                .filter(requirement -> requirement.getRequirementType() == type)
                .findFirst()
                .orElseThrow();
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
