package com.nwpengdep.hrms.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.nwpengdep.hrms.dto.EmployeeRequirementRequest;
import com.nwpengdep.hrms.dto.EmployeeUpdateRequest;
import com.nwpengdep.hrms.entity.Designation;
import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.entity.EmployeeCareerProgression;
import com.nwpengdep.hrms.entity.EmployeeRequirement;
import com.nwpengdep.hrms.entity.EmployeeStatus;
import com.nwpengdep.hrms.entity.EmploymentType;
import com.nwpengdep.hrms.entity.Grade;
import com.nwpengdep.hrms.entity.RequirementStatus;
import com.nwpengdep.hrms.entity.RequirementType;
import com.nwpengdep.hrms.entity.ServiceGrade1Requirement;
import com.nwpengdep.hrms.entity.ServiceLevel;
import com.nwpengdep.hrms.entity.ServicePermanentRequirement;
import com.nwpengdep.hrms.entity.ServiceType;
import com.nwpengdep.hrms.repository.DesignationRepository;
import com.nwpengdep.hrms.repository.EmployeeActionRepository;
import com.nwpengdep.hrms.repository.EmployeePostingRepository;
import com.nwpengdep.hrms.repository.EmployeeRepository;
import com.nwpengdep.hrms.repository.ServiceTypeRepository;

class EmployeeServiceRequirementUpdateTest {

    private static final String EB_GRADE_3_NAME = "EB Grade III Passed";
    private static final String LANGUAGE_NAME = "Government Language Qualification Passed";
    private static final String EB_GRADE_1_NAME = "EB Grade I Passed";

    private EmployeeRepository employeeRepository;
    private DesignationRepository designationRepository;
    private EmployeeService employeeService;
    private Employee savedEmployee;
    private Designation designation;
    private ServiceType service;

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
                requirementSyncService,
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
        );

        service = new ServiceType();
        service.setId(1L);
        service.setServiceCode("SLEgS");
        service.setAllowedGrades(EnumSet.of(
                Grade.III,
                Grade.II,
                Grade.I,
                Grade.SUPRA,
                Grade.SPECIAL
        ));
        service.setPermanentRequirements(new HashSet<>(Set.of(
                permanentRequirement(EB_GRADE_3_NAME),
                permanentRequirement(LANGUAGE_NAME)
        )));
        service.setGrade1Requirements(new HashSet<>(Set.of(
                grade1Requirement(EB_GRADE_1_NAME)
        )));

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
        lenient().when(employeeActionRepository.existsActiveActionsByEmployeeId(anyLong()))
                .thenReturn(true);
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
        savedEmployee.getRequirements().add(completedNamedRequirement(
                RequirementType.CUSTOM_PERMANENT_REQUIREMENT,
                EB_GRADE_3_NAME
        ));

        EmployeeUpdateRequest request = baseUpdateRequest();
        request.setRequirements(List.of(
                namedRequirementRequest(
                        RequirementType.CUSTOM_PERMANENT_REQUIREMENT,
                        EB_GRADE_3_NAME,
                        RequirementStatus.PENDING
                )
        ));

        Employee result = employeeService.updateEmployee(1L, request);

        assertEquals(
                RequirementStatus.PENDING,
                findNamedRequirement(
                        result,
                        RequirementType.CUSTOM_PERMANENT_REQUIREMENT,
                        EB_GRADE_3_NAME
                ).getStatus()
        );
    }

    @Test
    void preservesCompletedPermanentRequirementForConfirmedGradeThreeEmployee() {
        savedEmployee.getCareerProgression().setPermanentConfirmationDate(
                LocalDate.parse("2018-01-01")
        );
        savedEmployee.getRequirements().add(completedNamedRequirement(
                RequirementType.CUSTOM_PERMANENT_REQUIREMENT,
                EB_GRADE_3_NAME
        ));

        EmployeeUpdateRequest request = baseUpdateRequest();
        request.setRequirements(List.of(
                namedRequirementRequest(
                        RequirementType.CUSTOM_PERMANENT_REQUIREMENT,
                        EB_GRADE_3_NAME,
                        RequirementStatus.PENDING
                )
        ));

        Employee result = employeeService.updateEmployee(1L, request);

        assertEquals(
                RequirementStatus.COMPLETED,
                findNamedRequirement(
                        result,
                        RequirementType.CUSTOM_PERMANENT_REQUIREMENT,
                        EB_GRADE_3_NAME
                ).getStatus()
        );
    }

    @Test
    void allowsPendingRequirementToBecomeCompleted() {
        savedEmployee.getRequirements().add(pendingNamedRequirement(
                RequirementType.CUSTOM_PERMANENT_REQUIREMENT,
                EB_GRADE_3_NAME
        ));

        EmployeeUpdateRequest request = baseUpdateRequest();
        request.setRequirements(List.of(
                namedRequirementRequest(
                        RequirementType.CUSTOM_PERMANENT_REQUIREMENT,
                        EB_GRADE_3_NAME,
                        RequirementStatus.COMPLETED
                )
        ));

        Employee result = employeeService.updateEmployee(1L, request);

        assertEquals(
                RequirementStatus.COMPLETED,
                findNamedRequirement(
                        result,
                        RequirementType.CUSTOM_PERMANENT_REQUIREMENT,
                        EB_GRADE_3_NAME
                ).getStatus()
        );
    }

    @Test
    void qualificationUpdateOnlySkipsGradeDerivedAutoCompletion() {
        savedEmployee.setGrade(Grade.II);
        savedEmployee.getRequirements().add(completedNamedRequirement(
                RequirementType.CUSTOM_PERMANENT_REQUIREMENT,
                EB_GRADE_3_NAME
        ));
        savedEmployee.getRequirements().add(pendingNamedRequirement(
                RequirementType.CUSTOM_PERMANENT_REQUIREMENT,
                LANGUAGE_NAME
        ));

        EmployeeUpdateRequest request = baseUpdateRequest();
        request.setGrade(Grade.II);
        request.setQualificationUpdateOnly(true);
        request.setRequirements(List.of(
                namedRequirementRequest(
                        RequirementType.CUSTOM_PERMANENT_REQUIREMENT,
                        EB_GRADE_3_NAME,
                        RequirementStatus.COMPLETED
                ),
                namedRequirementRequest(
                        RequirementType.CUSTOM_PERMANENT_REQUIREMENT,
                        LANGUAGE_NAME,
                        RequirementStatus.PENDING
                )
        ));

        Employee result = employeeService.updateEmployee(1L, request);

        assertEquals(
                RequirementStatus.PENDING,
                findNamedRequirement(
                        result,
                        RequirementType.CUSTOM_PERMANENT_REQUIREMENT,
                        LANGUAGE_NAME
                ).getStatus()
        );
    }

    @Test
    void allowsGradeTwoEmployeeToUnsetCompletedGradeOneRequirement() {
        savedEmployee.setGrade(Grade.II);
        savedEmployee.getRequirements().add(completedNamedRequirement(
                RequirementType.CUSTOM_GRADE_1_REQUIREMENT,
                EB_GRADE_1_NAME
        ));

        EmployeeUpdateRequest request = baseUpdateRequest();
        request.setGrade(Grade.II);
        request.setRequirements(List.of(
                namedRequirementRequest(
                        RequirementType.CUSTOM_GRADE_1_REQUIREMENT,
                        EB_GRADE_1_NAME,
                        RequirementStatus.PENDING
                )
        ));

        Employee result = employeeService.updateEmployee(1L, request);

        assertEquals(
                RequirementStatus.PENDING,
                findNamedRequirement(
                        result,
                        RequirementType.CUSTOM_GRADE_1_REQUIREMENT,
                        EB_GRADE_1_NAME
                ).getStatus()
        );
    }

    @Test
    void preservesCompletedPermanentRequirementForGradeTwoEmployee() {
        savedEmployee.setGrade(Grade.II);
        savedEmployee.getRequirements().add(completedNamedRequirement(
                RequirementType.CUSTOM_PERMANENT_REQUIREMENT,
                EB_GRADE_3_NAME
        ));

        EmployeeUpdateRequest request = baseUpdateRequest();
        request.setGrade(Grade.II);
        request.setRequirements(List.of(
                namedRequirementRequest(
                        RequirementType.CUSTOM_PERMANENT_REQUIREMENT,
                        EB_GRADE_3_NAME,
                        RequirementStatus.PENDING
                )
        ));

        Employee result = employeeService.updateEmployee(1L, request);

        assertEquals(
                RequirementStatus.COMPLETED,
                findNamedRequirement(
                        result,
                        RequirementType.CUSTOM_PERMANENT_REQUIREMENT,
                        EB_GRADE_3_NAME
                ).getStatus()
        );
    }

    @Test
    void preservesGradeOneRequirementsForGradeOneEmployee() {
        savedEmployee.setGrade(Grade.I);
        savedEmployee.getRequirements().add(completedNamedRequirement(
                RequirementType.CUSTOM_GRADE_1_REQUIREMENT,
                EB_GRADE_1_NAME
        ));

        EmployeeUpdateRequest request = baseUpdateRequest();
        request.setGrade(Grade.I);
        request.setQualificationUpdateOnly(true);
        request.setRequirements(List.of(
                namedRequirementRequest(
                        RequirementType.CUSTOM_GRADE_1_REQUIREMENT,
                        EB_GRADE_1_NAME,
                        RequirementStatus.PENDING
                )
        ));

        Employee result = employeeService.updateEmployee(1L, request);

        assertEquals(
                RequirementStatus.COMPLETED,
                findNamedRequirement(
                        result,
                        RequirementType.CUSTOM_GRADE_1_REQUIREMENT,
                        EB_GRADE_1_NAME
                ).getStatus()
        );
    }

    @Test
    void qualificationUpdateOnlyWorksForOtherDesignationEmployeeWithoutCatalogDesignation() {
        savedEmployee.setDesignation(null);
        savedEmployee.setService(service);
        savedEmployee.setRecordedDesignationName("Test Designation");
        savedEmployee.getRequirements().add(pendingNamedRequirement(
                RequirementType.CUSTOM_PERMANENT_REQUIREMENT,
                EB_GRADE_3_NAME
        ));

        EmployeeUpdateRequest request = baseUpdateRequest();
        request.setDesignationId(null);
        request.setQualificationUpdateOnly(true);
        request.setRequirements(List.of(
                namedRequirementRequest(
                        RequirementType.CUSTOM_PERMANENT_REQUIREMENT,
                        EB_GRADE_3_NAME,
                        RequirementStatus.COMPLETED
                )
        ));

        Employee result = employeeService.updateEmployee(1L, request);

        assertEquals(
                RequirementStatus.COMPLETED,
                findNamedRequirement(
                        result,
                        RequirementType.CUSTOM_PERMANENT_REQUIREMENT,
                        EB_GRADE_3_NAME
                ).getStatus()
        );
    }

    @Test
    void qualificationUpdateOnlyUpdatesCustomPermanentRequirementForOtherEmployee() {
        ServicePermanentRequirement customRequirement = new ServicePermanentRequirement();
        customRequirement.setRequirementName("Professional Registration");
        service.setPermanentRequirements(new HashSet<>(Set.of(customRequirement)));

        savedEmployee.setDesignation(null);
        savedEmployee.setService(service);
        savedEmployee.setRecordedDesignationName("Test Designation");
        savedEmployee.getRequirements().add(pendingNamedRequirement(
                RequirementType.CUSTOM_PERMANENT_REQUIREMENT,
                "Professional Registration"
        ));

        EmployeeUpdateRequest request = baseUpdateRequest();
        request.setDesignationId(null);
        request.setQualificationUpdateOnly(true);
        request.setRequirements(List.of(
                namedRequirementRequest(
                        RequirementType.CUSTOM_PERMANENT_REQUIREMENT,
                        "Professional Registration",
                        RequirementStatus.COMPLETED
                )
        ));

        Employee result = employeeService.updateEmployee(1L, request);

        assertEquals(
                RequirementStatus.COMPLETED,
                findNamedRequirement(
                        result,
                        RequirementType.CUSTOM_PERMANENT_REQUIREMENT,
                        "Professional Registration"
                ).getStatus()
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

    private ServicePermanentRequirement permanentRequirement(String name) {
        ServicePermanentRequirement requirement = new ServicePermanentRequirement();
        requirement.setService(service);
        requirement.setRequirementName(name);
        return requirement;
    }

    private ServiceGrade1Requirement grade1Requirement(String name) {
        ServiceGrade1Requirement requirement = new ServiceGrade1Requirement();
        requirement.setService(service);
        requirement.setRequirementName(name);
        return requirement;
    }

    private EmployeeRequirement completedNamedRequirement(
            RequirementType type,
            String name
    ) {
        EmployeeRequirement requirement = new EmployeeRequirement();
        requirement.setId(1L);
        requirement.setEmployee(savedEmployee);
        requirement.setRequirementType(type);
        requirement.setRequirementName(name);
        requirement.setStatus(RequirementStatus.COMPLETED);
        requirement.setCompletedDate(LocalDate.parse("2020-01-01"));
        return requirement;
    }

    private EmployeeRequirement pendingNamedRequirement(
            RequirementType type,
            String name
    ) {
        EmployeeRequirement requirement = new EmployeeRequirement();
        requirement.setId(2L);
        requirement.setEmployee(savedEmployee);
        requirement.setRequirementType(type);
        requirement.setRequirementName(name);
        requirement.setStatus(RequirementStatus.PENDING);
        return requirement;
    }

    private EmployeeRequirementRequest namedRequirementRequest(
            RequirementType type,
            String name,
            RequirementStatus status
    ) {
        EmployeeRequirementRequest request = new EmployeeRequirementRequest();
        request.setRequirementType(type);
        request.setRequirementName(name);
        request.setStatus(status);
        return request;
    }

    private EmployeeRequirement findNamedRequirement(
            Employee employee,
            RequirementType type,
            String name
    ) {
        return employee.getRequirements()
                .stream()
                .filter(requirement -> requirement.getRequirementType() == type)
                .filter(requirement ->
                        name.equalsIgnoreCase(requirement.getRequirementName()))
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
        request.setCurrentDistrictOfWorking("Kurunegala");
        request.setEnteredDateToNWPCouncil(LocalDate.parse("2015-01-01"));
        request.setPermanentAddress("123 Main Street");
        request.setContactNo("0712345678");
        request.setMaritalStatus("Single");
        request.setWidowsOrphansPensionNo("WOP-001");
        request.setServiceLevelId(10L);
        request.setEmploymentType(EmploymentType.PERMANENT);
        return request;
    }
}
