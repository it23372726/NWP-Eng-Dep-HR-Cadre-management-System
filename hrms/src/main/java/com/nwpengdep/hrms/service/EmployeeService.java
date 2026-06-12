package com.nwpengdep.hrms.service;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.nwpengdep.hrms.dto.EmployeeRequest;
import com.nwpengdep.hrms.dto.EmployeeRequirementRequest;
import com.nwpengdep.hrms.dto.EmployeeUpdateRequest;
import com.nwpengdep.hrms.entity.Designation;
import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.entity.EmployeeActionType;
import com.nwpengdep.hrms.entity.EmployeeCareerProgression;
import com.nwpengdep.hrms.entity.EmployeeEntryType;
import com.nwpengdep.hrms.entity.EmployeePosting;
import com.nwpengdep.hrms.entity.EmployeeRequirement;
import com.nwpengdep.hrms.entity.EmployeeStatus;
import com.nwpengdep.hrms.entity.EmploymentType;
import com.nwpengdep.hrms.entity.Grade;
import com.nwpengdep.hrms.entity.PermanentStatus;
import com.nwpengdep.hrms.entity.RequirementStatus;
import com.nwpengdep.hrms.entity.RequirementType;
import com.nwpengdep.hrms.entity.ServiceLevel;
import com.nwpengdep.hrms.repository.DesignationRepository;
import com.nwpengdep.hrms.repository.EmployeePostingRepository;
import com.nwpengdep.hrms.repository.EmployeeRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class EmployeeService {

    private final EmployeeRepository employeeRepository;
    private final DesignationRepository designationRepository;
    private final EmployeePostingRepository postingRepository;
    private final ServiceLevelService serviceLevelService;
    private final DesignationAssignmentValidator designationAssignmentValidator;
    private final EmployeeActionService employeeActionService;
    private final CareerProgressionService careerProgressionService;
    private final EmployeeRequirementSyncService requirementSyncService;

    @Transactional
    public Employee createEmployee(EmployeeRequest request) {
        if (request.getEntryType() == EmployeeEntryType.TRANSFER_IN) {
            if (request.getTransferredFrom() == null
                    || request.getTransferredFrom().isBlank()) {
                throw new RuntimeException(
                        "Transferred from is required for transfer-in employees"
                );
            }
        }

        Designation designation = resolveDesignation(request.getDesignationId());
        ServiceLevel serviceLevel =
                serviceLevelService.resolve(request.getServiceLevelId());

        Employee employee = mapRequestToEmployee(
                new Employee(),
                request,
                designation,
                serviceLevel
        );

        employee.setStatus(EmployeeStatus.ACTIVE);
        requirementSyncService.syncEmployeeRequirements(employee);
        careerProgressionService.recalculateEmployeeCareer(employee);

        designationAssignmentValidator.validate(employee, designation);

        employee = employeeRepository.save(employee);

        EmployeePosting initialPosting = EmployeePosting.builder()
                .employee(employee)
                .designation(designation)
                .startDate(request.getReportedDateToPresentWorkingPlace())
                .currentPosting(true)
                .build();

        postingRepository.save(initialPosting);

        if (request.getEntryType() == EmployeeEntryType.TRANSFER_IN) {
            employee.setTransferredFrom(request.getTransferredFrom().trim());
            employeeRepository.save(employee);

            employeeActionService.recordAction(
                    employee,
                    EmployeeActionType.TRANSFER_IN,
                    request.getReportedDateToPresentWorkingPlace(),
                    null,
                    designation,
                    request.getTransferredFrom().trim(),
                    null,
                    null,
                    request.getRemarks()
            );
        } else {
            employeeActionService.recordAction(
                    employee,
                    EmployeeActionType.NEW_APPOINTMENT,
                    request.getReportedDateToPresentWorkingPlace(),
                    null,
                    designation,
                    null,
                    null,
                    null,
                    request.getRemarks()
            );
        }

        return employee;
    }

    public List<Employee> getActiveEmployees() {
        return employeeRepository.findByStatus(EmployeeStatus.ACTIVE);
    }

    public List<Employee> getInactiveEmployees() {
        return employeeRepository.findByStatus(EmployeeStatus.INACTIVE);
    }

    public List<Employee> getAllEmployees() {
        return getActiveEmployees();
    }

    @Transactional
    public Employee getEmployeeById(Long id) {
        Employee employee = employeeRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Employee not found"));

        requirementSyncService.syncEmployeeRequirements(employee);
        careerProgressionService.recalculateEmployeeCareer(employee);
        return employeeRepository.save(employee);
    }

    public void deleteEmployee(Long id) {
        throw new RuntimeException(
                "Employees cannot be deleted. Use lifecycle actions instead."
        );
    }

    @Transactional
    public Employee updateEmployee(Long id, EmployeeUpdateRequest request) {
        Employee employee = getEmployeeById(id);

        if (employee.getStatus() != EmployeeStatus.ACTIVE) {
            throw new RuntimeException(
                    "Only active employees can be updated"
            );
        }

        Designation designation = resolveDesignation(request.getDesignationId());

        if (employee.getDesignation() == null
                || !designation.getId().equals(employee.getDesignation().getId())) {
            throw new RuntimeException(
                    "Designation changes must be done through promotion"
            );
        }

        ServiceLevel serviceLevel =
                serviceLevelService.resolve(request.getServiceLevelId());

        mapUpdateRequestToEmployee(
                employee,
                request,
                designation,
                serviceLevel
        );

        requirementSyncService.syncEmployeeRequirements(employee);
        careerProgressionService.recalculateEmployeeCareer(employee);

        designationAssignmentValidator.validate(employee, designation);

        return employeeRepository.save(employee);
    }

    public List<Employee> searchActiveEmployees(String keyword) {
        return employeeRepository
                .findByFullNameContainingIgnoreCaseAndStatus(
                        keyword,
                        EmployeeStatus.ACTIVE
                );
    }

    public List<Employee> searchInactiveEmployees(String keyword) {
        return employeeRepository
                .findByFullNameContainingIgnoreCaseAndStatus(
                        keyword,
                        EmployeeStatus.INACTIVE
                );
    }

    public List<Employee> searchEmployees(String keyword) {
        return searchActiveEmployees(keyword);
    }

    public Page<Employee> getEmployeesPaginated(int page, int size) {
        return employeeRepository.findAll(PageRequest.of(page, size));
    }

    private void mapUpdateRequestToEmployee(
            Employee employee,
            EmployeeUpdateRequest request,
            Designation designation,
            ServiceLevel serviceLevel
    ) {
        employee.setEmployeeNo(request.getEmployeeNo().trim());
        employee.setFullName(request.getFullName().trim());
        employee.setDesignation(designation);
        employee.setNic(request.getNic().trim());
        employee.setDateOfBirth(request.getDateOfBirth());
        employee.setGender(request.getGender());
        employee.setGrade(resolveGrade(request.getEmploymentType(), request.getGrade()));
        employee.setDateOfFirstAppointment(request.getDateOfFirstAppointment());
        employee.setIncremantDate(request.getIncremantDate());
        employee.setEnteredDateToAllIslandService(
                request.getEnteredDateToAllIslandService()
        );
        employee.setReportedDateToPresentWorkingPlace(
                request.getReportedDateToPresentWorkingPlace()
        );
        employee.setCurrentWorkingPlace(request.getCurrentWorkingPlace().trim());
        employee.setCurrentDistrictOfWorking(
                request.getCurrentDistrictOfWorking()
        );
        employee.setAppointmentDateToPresentClassGrade(
                request.getAppointmentDateToPresentClassGrade()
        );
        employee.setEnteredDateToNWPCouncil(request.getEnteredDateToNWPCouncil());
        employee.setPermanentAddress(request.getPermanentAddress().trim());
        employee.setResidentDistrict(request.getResidentDistrict());
        employee.setContactNo(request.getContactNo().trim());
        employee.setServiceLevel(serviceLevel);
        employee.setEmploymentType(
                request.getEmploymentType() != null
                        ? request.getEmploymentType()
                        : EmploymentType.PERMANENT
        );
        applyQualificationFields(
                employee,
                request.getEbGrade3Passed(),
                request.getLanguageQualificationPassed(),
                request.getMedicalReportCompleted(),
                request.getOlApproved(),
                request.getAlApproved(),
                request.getDegreeApproved(),
                request.getOtherQualificationName(),
                request.getOtherQualificationApproved(),
                request.getBirthCertificateApproved(),
                request.getAlreadyConfirmedPermanent(),
                request.getPermanentConfirmationDate(),
                request.getEbGrade2Passed(),
                request.getOtherGrade2RequirementCompleted(),
                request.getGrade2RequiredYears(),
                request.getGrade1RequiredYears(),
                request.getRequirements()
        );
    }

    private Employee mapRequestToEmployee(
            Employee employee,
            EmployeeRequest request,
            Designation designation,
            ServiceLevel serviceLevel
    ) {
        employee.setEmployeeNo(request.getEmployeeNo().trim());
        employee.setFullName(request.getFullName().trim());
        employee.setDesignation(designation);
        employee.setNic(request.getNic().trim());
        employee.setDateOfBirth(request.getDateOfBirth());
        employee.setGender(request.getGender());
        employee.setGrade(resolveGrade(request.getEmploymentType(), request.getGrade()));
        employee.setDateOfFirstAppointment(request.getDateOfFirstAppointment());
        employee.setIncremantDate(request.getIncremantDate());
        employee.setEnteredDateToAllIslandService(
                request.getEnteredDateToAllIslandService()
        );
        employee.setReportedDateToPresentWorkingPlace(
                request.getReportedDateToPresentWorkingPlace()
        );
        employee.setCurrentWorkingPlace(request.getCurrentWorkingPlace().trim());
        employee.setCurrentDistrictOfWorking(
                request.getCurrentDistrictOfWorking()
        );
        employee.setAppointmentDateToPresentClassGrade(
                request.getAppointmentDateToPresentClassGrade()
        );
        employee.setEnteredDateToNWPCouncil(request.getEnteredDateToNWPCouncil());
        employee.setPermanentAddress(request.getPermanentAddress().trim());
        employee.setResidentDistrict(request.getResidentDistrict());
        employee.setContactNo(request.getContactNo().trim());
        employee.setServiceLevel(serviceLevel);
        employee.setEmploymentType(
                request.getEmploymentType() != null
                        ? request.getEmploymentType()
                        : EmploymentType.PERMANENT
        );
        applyQualificationFields(
                employee,
                request.getEbGrade3Passed(),
                request.getLanguageQualificationPassed(),
                request.getMedicalReportCompleted(),
                request.getOlApproved(),
                request.getAlApproved(),
                request.getDegreeApproved(),
                request.getOtherQualificationName(),
                request.getOtherQualificationApproved(),
                request.getBirthCertificateApproved(),
                request.getAlreadyConfirmedPermanent(),
                request.getPermanentConfirmationDate(),
                request.getEbGrade2Passed(),
                request.getOtherGrade2RequirementCompleted(),
                request.getGrade2RequiredYears(),
                request.getGrade1RequiredYears(),
                request.getRequirements()
        );

        return employee;
    }

    private Grade resolveGrade(EmploymentType employmentType, Grade grade) {
        if (employmentType != EmploymentType.PERMANENT) {
            return Grade.NONE;
        }
        return grade != null ? grade : Grade.NONE;
    }

    private void applyQualificationFields(
            Employee employee,
            Boolean ebGrade3Passed,
            Boolean languageQualificationPassed,
            Boolean medicalReportCompleted,
            Boolean olApproved,
            Boolean alApproved,
            Boolean degreeApproved,
            String otherQualificationName,
            Boolean otherQualificationApproved,
            Boolean birthCertificateApproved,
            Boolean alreadyConfirmedPermanent,
            LocalDate permanentConfirmationDate,
            Boolean ebGrade2Passed,
            Boolean otherGrade2RequirementCompleted,
            Integer grade2RequiredYears,
            Integer grade1RequiredYears,
            List<EmployeeRequirementRequest> requirements
    ) {
        EmployeeCareerProgression careerProgression =
                careerProgressionService.ensureCareerProgression(employee);

        if (requirements != null) {
            applyRequirementRequests(employee, requirements);
        } else {
            applyLegacyRequirementFields(
                    employee,
                    ebGrade3Passed,
                    languageQualificationPassed,
                    medicalReportCompleted,
                    olApproved,
                    alApproved,
                    degreeApproved,
                    otherQualificationName,
                    otherQualificationApproved,
                    birthCertificateApproved,
                    ebGrade2Passed,
                    otherGrade2RequirementCompleted
            );
        }

        requirementSyncService.syncEmployeeRequirements(employee);

        boolean permanentGradeThreeAlreadyConfirmed =
                employee.getEmploymentType() == EmploymentType.PERMANENT
                        && employee.getGrade() == Grade.III
                        && Boolean.TRUE.equals(alreadyConfirmedPermanent);
        boolean permanentGradeTwoOrAbove =
                employee.getEmploymentType() == EmploymentType.PERMANENT
                        && (employee.getGrade() == Grade.II
                            || employee.getGrade() == Grade.I
                            || employee.getGrade() == Grade.SUPRA
                            || employee.getGrade() == Grade.SPECIAL);

        if (permanentGradeThreeAlreadyConfirmed || permanentGradeTwoOrAbove) {
            markPermanentRequirementsCompleted(employee);
        }

        if (permanentGradeThreeAlreadyConfirmed || permanentGradeTwoOrAbove) {
            LocalDate confirmedDate = permanentConfirmationDate != null
                    ? permanentConfirmationDate
                    : employee.getAppointmentDateToPresentClassGrade();
            careerProgression.setPermanentConfirmationDate(confirmedDate);
            careerProgression.setGrade3AchievedDate(confirmedDate);
        } else if (careerProgression.getPermanentConfirmationDate() != null
                && employee.getPermanentStatus() == PermanentStatus.PERMANENT) {
            careerProgression.setPermanentConfirmationDate(null);
        }

        if (permanentGradeTwoOrAbove) {
            setRequirementCompleted(employee, RequirementType.EB_GRADE_2);
            markCustomGrade2RequirementsCompleted(employee);
        }
        if (employee.getGrade() == Grade.I
                || employee.getGrade() == Grade.SUPRA
                || employee.getGrade() == Grade.SPECIAL) {
            setRequirementCompleted(employee, RequirementType.EB_GRADE_1);
            markCustomGrade1RequirementsCompleted(employee);
        }
        careerProgression.setGrade2RequiredYears(
                employee.getDesignation() != null
                        ? employee.getDesignation().getGrade2RequiredYears()
                        : grade2RequiredYears
        );
        careerProgression.setGrade1RequiredYears(
                employee.getDesignation() != null
                        ? employee.getDesignation().getGrade1RequiredYears()
                        : grade1RequiredYears
        );
    }

    private void markPermanentRequirementsCompleted(Employee employee) {
        setRequirementCompleted(employee, RequirementType.EB_GRADE_3);
        setRequirementCompleted(
                employee,
                RequirementType.GOVERNMENT_LANGUAGE_QUALIFICATION
        );
        setRequirementCompleted(employee, RequirementType.MEDICAL_REPORT);
        setRequirementCompleted(employee, RequirementType.OL_CERTIFICATE);
        setRequirementCompleted(employee, RequirementType.AL_CERTIFICATE);
        setRequirementCompleted(employee, RequirementType.DEGREE_CERTIFICATE);
        setRequirementCompleted(employee, RequirementType.BIRTH_CERTIFICATE);
        if (employee.getDesignation() != null
                && employee.getDesignation().getPermanentRequirements() != null) {
            employee.getDesignation()
                    .getPermanentRequirements()
                    .forEach(requirement -> setRequirementCompleted(
                            employee,
                            RequirementType.CUSTOM_PERMANENT_REQUIREMENT,
                            requirement.getRequirementName()
                    ));
        }
    }

    private void markCustomGrade2RequirementsCompleted(Employee employee) {
        if (employee.getDesignation() == null
                || employee.getDesignation().getGrade2Requirements() == null) {
            return;
        }

        employee.getDesignation()
                .getGrade2Requirements()
                .forEach(requirement -> setRequirementCompleted(
                        employee,
                        RequirementType.CUSTOM_GRADE_2_REQUIREMENT,
                        requirement.getRequirementName()
                ));
    }

    private void markCustomGrade1RequirementsCompleted(Employee employee) {
        if (employee.getDesignation() == null
                || employee.getDesignation().getGrade1Requirements() == null) {
            return;
        }

        employee.getDesignation()
                .getGrade1Requirements()
                .forEach(requirement -> setRequirementCompleted(
                        employee,
                        RequirementType.CUSTOM_GRADE_1_REQUIREMENT,
                        requirement.getRequirementName()
                ));
    }

    private void applyLegacyRequirementFields(
            Employee employee,
            Boolean ebGrade3Passed,
            Boolean languageQualificationPassed,
            Boolean medicalReportCompleted,
            Boolean olApproved,
            Boolean alApproved,
            Boolean degreeApproved,
            String otherQualificationName,
            Boolean otherQualificationApproved,
            Boolean birthCertificateApproved,
            Boolean ebGrade2Passed,
            Boolean otherGrade2RequirementCompleted
    ) {
        setRequirementStatus(
                employee,
                RequirementType.EB_GRADE_3,
                ebGrade3Passed,
                null
        );
        setRequirementStatus(
                employee,
                RequirementType.GOVERNMENT_LANGUAGE_QUALIFICATION,
                languageQualificationPassed,
                null
        );
        setRequirementStatus(
                employee,
                RequirementType.MEDICAL_REPORT,
                medicalReportCompleted,
                null
        );
        setRequirementStatus(
                employee,
                RequirementType.OL_CERTIFICATE,
                olApproved,
                null
        );
        setRequirementStatus(
                employee,
                RequirementType.AL_CERTIFICATE,
                alApproved,
                null
        );
        setRequirementStatus(
                employee,
                RequirementType.DEGREE_CERTIFICATE,
                degreeApproved,
                null
        );
        setRequirementStatus(
                employee,
                RequirementType.BIRTH_CERTIFICATE,
                birthCertificateApproved,
                null
        );
        setRequirementStatus(
                employee,
                RequirementType.EB_GRADE_2,
                ebGrade2Passed,
                null
        );
    }

    private void applyRequirementRequests(
            Employee employee,
            List<EmployeeRequirementRequest> requirements
    ) {
        requirements.stream()
                .filter(request -> request.getRequirementType() != null)
                .forEach(request -> upsertRequirement(
                        employee,
                        request.getRequirementType(),
                        request.getStatus() != null
                                ? request.getStatus()
                                : RequirementStatus.PENDING,
                        request.getRequirementName(),
                        request.getCompletedDate(),
                        request.getRemarks()
                ));
    }

    private void setRequirementStatus(
            Employee employee,
            RequirementType type,
            Boolean completed,
            String requirementName
    ) {
        upsertRequirement(
                employee,
                type,
                Boolean.TRUE.equals(completed)
                        ? RequirementStatus.COMPLETED
                        : RequirementStatus.PENDING,
                requirementName,
                Boolean.TRUE.equals(completed) ? LocalDate.now() : null,
                null
        );
    }

    private void setRequirementCompleted(Employee employee, RequirementType type) {
        setRequirementCompleted(employee, type, null);
    }

    private void setRequirementCompleted(
            Employee employee,
            RequirementType type,
            String requirementName
    ) {
        upsertRequirement(
                employee,
                type,
                RequirementStatus.COMPLETED,
                requirementName,
                LocalDate.now(),
                null
        );
    }

    private void upsertRequirement(
            Employee employee,
            RequirementType type,
            RequirementStatus status,
            String requirementName,
            LocalDate completedDate,
            String remarks
    ) {
        if (employee.getRequirements() == null) {
            employee.setRequirements(new java.util.ArrayList<>());
        }

        EmployeeRequirement requirement = employee.getRequirements()
                .stream()
                .filter(existing -> existing.getRequirementType() == type
                        && sameRequirementName(
                                existing.getRequirementName(),
                                requirementName
                        ))
                .findFirst()
                .orElseGet(() -> {
                    EmployeeRequirement created = new EmployeeRequirement();
                    created.setEmployee(employee);
                    created.setRequirementType(type);
                    employee.getRequirements().add(created);
                    return created;
                });

        requirement.setStatus(status);
        requirement.setRequirementName(
                requirementName != null && !requirementName.isBlank()
                        ? requirementName.trim()
                        : null
        );
        requirement.setCompletedDate(
                status == RequirementStatus.COMPLETED
                        ? (completedDate != null ? completedDate : LocalDate.now())
                        : null
        );
        requirement.setRemarks(
                remarks != null && !remarks.isBlank() ? remarks.trim() : null
        );
    }

    private boolean sameRequirementName(String left, String right) {
        String leftValue = left != null ? left.trim() : "";
        String rightValue = right != null ? right.trim() : "";
        return leftValue.equalsIgnoreCase(rightValue);
    }

    private Designation resolveDesignation(Long designationId) {
        return designationRepository.findById(designationId)
                .orElseThrow(() ->
                        new RuntimeException("Designation not found"));
    }
}
