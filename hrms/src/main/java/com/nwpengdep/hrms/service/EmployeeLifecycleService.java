package com.nwpengdep.hrms.service;

import java.time.LocalDate;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.nwpengdep.hrms.constants.DepartmentConstants;
import com.nwpengdep.hrms.dto.ActionWorkplaceFields;
import com.nwpengdep.hrms.dto.DismissalRequest;
import com.nwpengdep.hrms.dto.LifecycleActionRequest;
import com.nwpengdep.hrms.dto.MakePermanentRequest;
import com.nwpengdep.hrms.dto.NewAppointmentRequest;
import com.nwpengdep.hrms.dto.OfficeChangeRequest;
import com.nwpengdep.hrms.dto.PromotionRequest;
import com.nwpengdep.hrms.dto.TransferOutRequest;
import com.nwpengdep.hrms.entity.Designation;
import com.nwpengdep.hrms.entity.District;
import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.entity.EmployeeActionType;
import com.nwpengdep.hrms.entity.EmployeeCareerProgression;
import com.nwpengdep.hrms.entity.EmployeePosting;
import com.nwpengdep.hrms.entity.EmployeeRequirement;
import com.nwpengdep.hrms.entity.EmployeeStatus;
import com.nwpengdep.hrms.entity.EmploymentType;
import com.nwpengdep.hrms.entity.Grade;
import com.nwpengdep.hrms.entity.RequirementStatus;
import com.nwpengdep.hrms.entity.RequirementType;
import com.nwpengdep.hrms.entity.ServiceLevel;
import com.nwpengdep.hrms.repository.DesignationRepository;
import com.nwpengdep.hrms.repository.EmployeePostingRepository;
import com.nwpengdep.hrms.repository.EmployeeRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class EmployeeLifecycleService {

    private final EmployeeRepository employeeRepository;
    private final DesignationRepository designationRepository;
    private final EmployeePostingRepository postingRepository;
    private final DesignationAssignmentValidator designationAssignmentValidator;
    private final EmployeeActionService employeeActionService;
    private final ServiceLevelService serviceLevelService;
    private final CareerProgressionService careerProgressionService;
    private final EmployeeRequirementSyncService requirementSyncService;
    private final OfficeService officeService;

    @Transactional
    public Employee transferOut(Long employeeId, TransferOutRequest request) {
        Employee employee = requireActiveEmployee(employeeId);

        String fromDepartment = employee.getCurrentDepartment();
        String fromOffice = employee.getCurrentOffice();
        if (fromDepartment == null || fromDepartment.isBlank()) {
            throw new RuntimeException("Employee current department is not set");
        }
        if (fromOffice == null || fromOffice.isBlank()) {
            throw new RuntimeException("Employee current office is not set");
        }

        officeService.validateNwpWorkplaceIfNwp(
                request.getToDepartment(),
                request.getToOffice(),
                request.getToDistrict()
        );

        employeeActionService.recordPairedTransferOut(
                employee,
                request.getTransferDate(),
                employee.getDesignation(),
                fromDepartment,
                fromOffice,
                request.getToDepartment(),
                request.getToOffice(),
                request.getToDistrict(),
                request.getRemarks()
        );

        return employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));
    }

    @Transactional
    public Employee officeChange(Long employeeId, OfficeChangeRequest request) {
        Employee employee = requireActiveEmployee(employeeId);

        String currentDepartment = employee.getCurrentDepartment();
        if (currentDepartment == null || currentDepartment.isBlank()) {
            throw new RuntimeException("Employee current department is not set");
        }

        String newOffice = request.getOffice().trim();
        District newDistrict = request.getDistrict();
        if (DepartmentConstants.isNwpEngineering(currentDepartment)) {
            if (newDistrict == null) {
                throw new RuntimeException(
                        "Working district is required for N.W.P. Engineering Department"
                );
            }
            officeService.validateNwpWorkplace(newOffice, newDistrict);
        }

        boolean sameOffice = employee.getCurrentOffice() != null
                && employee.getCurrentOffice().equalsIgnoreCase(newOffice);
        boolean sameDistrict = DepartmentConstants.isNwpEngineering(currentDepartment)
                && employee.getCurrentDistrictOfWorking() == newDistrict;
        boolean noNwpChange = DepartmentConstants.isNwpEngineering(currentDepartment)
                && sameOffice
                && sameDistrict;

        if (DepartmentConstants.isNwpEngineering(currentDepartment)) {
            if (noNwpChange) {
                throw new RuntimeException(
                        "Office change requires a different office or working district"
                );
            }
        } else if (sameOffice) {
            throw new RuntimeException("Office change requires a different office");
        }

        employeeActionService.recordAction(
                employee,
                EmployeeActionType.OFFICE_CHANGE,
                request.getEffectiveDate(),
                employee.getDesignation(),
                employee.getDesignation(),
                null,
                null,
                null,
                request.getRemarks(),
                ActionWorkplaceFields.builder()
                        .department(currentDepartment)
                        .office(newOffice)
                        .fromDepartment(currentDepartment)
                        .fromOffice(employee.getCurrentOffice())
                        .toDepartment(currentDepartment)
                        .toOffice(newOffice)
                        .district(
                                DepartmentConstants.isNwpEngineering(currentDepartment)
                                        ? newDistrict
                                        : null
                        )
                        .build()
        );

        employeeActionService.recalculateEmployeeState(employeeId);

        return employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));
    }

    @Transactional
    public Employee appointNewEmployee(Long employeeId, NewAppointmentRequest request) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        employee.setStatus(EmployeeStatus.ACTIVE);
        employeeRepository.save(employee);

        EmployeePosting newPosting = EmployeePosting.builder()
                .employee(employee)
                .designation(employee.getDesignation())
                .startDate(request.getAppointmentDate())
                .currentPosting(true)
                .build();

        postingRepository.save(newPosting);

        officeService.validateNwpWorkplaceIfNwp(
                request.getDepartment(),
                request.getOffice(),
                request.getDistrict()
        );

        employeeActionService.recordAction(
                employee,
                EmployeeActionType.NEW_APPOINTMENT,
                request.getAppointmentDate(),
                null,
                employee.getDesignation(),
                null,
                null,
                null,
                request.getRemarks(),
                ActionWorkplaceFields.of(
                        DepartmentConstants.normalize(request.getDepartment()),
                        request.getOffice().trim(),
                        DepartmentConstants.isNwpEngineering(request.getDepartment())
                                ? request.getDistrict()
                                : null
                )
        );

        employeeActionService.recalculateEmployeeState(employeeId);

        return employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));
    }

    @Transactional
    public Employee promoteEmployee(Long employeeId, PromotionRequest request) {
        Employee employee = requireActiveEmployee(employeeId);
        Designation oldDesignation = employee.getDesignation();
        Grade oldGrade = employee.getGrade();
        ServiceLevel oldServiceLevel = employee.getServiceLevel();

        Designation targetDesignation = designationRepository.findById(
                        request.getNewDesignationId()
                )
                .orElseThrow(() ->
                        new RuntimeException("Designation not found"));

        ServiceLevel targetServiceLevel =
                serviceLevelService.resolve(request.getServiceLevelId());

        validatePromotionServiceBoundary(oldDesignation, targetDesignation);

        EmployeeCareerProgression careerProgression =
                careerProgressionService.ensureCareerProgression(employee);
        applyPromotionRequirements(employee, request);
        requirementSyncService.syncEmployeeRequirements(employee);
        careerProgression.setGrade2RequiredYears(targetDesignation.getGrade2RequiredYears());
        careerProgression.setGrade1RequiredYears(targetDesignation.getGrade1RequiredYears());
        careerProgressionService.recalculateEmployeeCareer(employee);

        careerProgressionService.validateAssignmentEffectiveDate(
                employee,
                oldGrade,
                request.getGrade(),
                request.getPromotionDate()
        );

        if (oldGrade == Grade.III
                && request.getGrade() == Grade.II
                && !careerProgressionService.isQualifiedForGrade2On(
                        employee,
                        request.getPromotionDate()
                )) {
            throw new RuntimeException(
                    "This employee has not yet qualified for Grade II promotion."
            );
        }

        if (oldGrade == Grade.II
                && request.getGrade() == Grade.I
                && !careerProgressionService.isQualifiedForGrade1On(
                        employee,
                        request.getPromotionDate()
                )) {
            throw new RuntimeException(
                    "This employee has not yet qualified for Grade I promotion."
            );
        }

        employee.setGrade(request.getGrade());
        employee.setServiceLevel(targetServiceLevel);

        designationAssignmentValidator.validate(employee, targetDesignation);

        boolean designationChanged = oldDesignation == null
                || !oldDesignation
                        .getId()
                        .equals(targetDesignation.getId());
        boolean gradeChanged = oldGrade != request.getGrade();
        boolean serviceLevelChanged = oldServiceLevel == null
                || !oldServiceLevel.getId().equals(targetServiceLevel.getId());

        if (gradeChanged) {
            employee.setAppointmentDateToPresentClassGrade(request.getPromotionDate());
        }

        if (!designationChanged && !gradeChanged && !serviceLevelChanged) {
            careerProgressionService.recalculateEmployeeCareer(employee);
            return employeeRepository.save(employee);
        }

        if (designationChanged) {
            closeCurrentPostings(employee, request.getPromotionDate());
        }

        employee.setDesignation(targetDesignation);
        requirementSyncService.syncEmployeeRequirements(employee);
        careerProgressionService.recalculateEmployeeCareer(employee);
        employeeRepository.save(employee);

        if (designationChanged) {
            EmployeePosting newPosting = EmployeePosting.builder()
                    .employee(employee)
                    .designation(targetDesignation)
                    .startDate(request.getPromotionDate())
                    .currentPosting(true)
                    .build();

            postingRepository.save(newPosting);
        }

        EmployeeActionType actionType = designationChanged
                ? EmployeeActionType.PROMOTION
                : EmployeeActionType.ASSIGNMENT_GRADE_UPDATE;

        ActionWorkplaceFields workplace = workplaceFromEmployee(employee);

        employeeActionService.recordActionWithGrades(
                employee,
                actionType,
                request.getPromotionDate(),
                oldDesignation,
                targetDesignation,
                oldGrade,
                request.getGrade(),
                null,
                null,
                null,
                request.getRemarks(),
                workplace
        );

        employeeActionService.recalculateEmployeeState(employeeId);

        return employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));
    }

    @Transactional
    public Employee retireEmployee(Long employeeId, LifecycleActionRequest request) {
        return deactivateEmployee(
                employeeId,
                request,
                EmployeeActionType.RETIREMENT_OR_RESIGNATION,
                null
        );
    }

    @Transactional
    public Employee markDeath(Long employeeId, LifecycleActionRequest request) {
        return deactivateEmployee(
                employeeId,
                request,
                EmployeeActionType.DEATH,
                null
        );
    }

    @Transactional
    public Employee dismissEmployee(Long employeeId, DismissalRequest request) {
        Employee employee = requireActiveEmployee(employeeId);

        closeCurrentPostings(employee, request.getActionDate());

        employee.setStatus(EmployeeStatus.INACTIVE);
        employeeRepository.save(employee);

        employeeActionService.recordAction(
                employee,
                EmployeeActionType.DISMISSAL,
                request.getActionDate(),
                employee.getDesignation(),
                null,
                null,
                null,
                request.getReason().trim(),
                request.getRemarks(),
                workplaceFromEmployee(employee)
        );

        employeeActionService.recalculateEmployeeState(employeeId);

        return employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));
    }

    @Transactional
    public Employee makePermanent(Long employeeId, MakePermanentRequest request) {
        Employee employee = requireActiveEmployee(employeeId);

        requirementSyncService.syncEmployeeRequirements(employee);
        careerProgressionService.calculatePermanentEligibility(employee);
        EmployeeCareerProgression careerProgression =
                careerProgressionService.ensureCareerProgression(employee);
        if (!Boolean.TRUE.equals(careerProgression.getQualifiedForPermanent())) {
            throw new RuntimeException(
                    "Employee is not qualified for permanent confirmation"
            );
        }

        validateConfirmationDate(employee, request.getConfirmationDate());

        careerProgression.setPermanentConfirmationDate(request.getConfirmationDate());
        employee.setAppointmentDateToPresentClassGrade(request.getConfirmationDate());
        careerProgressionService.recalculateEmployeeCareer(employee);
        employeeRepository.save(employee);

        employeeActionService.recordAction(
                employee,
                EmployeeActionType.PERMANENT_CONFIRMATION,
                request.getConfirmationDate(),
                null,
                employee.getDesignation(),
                null,
                null,
                null,
                request.getRemarks(),
                workplaceFromEmployee(employee)
        );

        employeeActionService.recalculateEmployeeState(employeeId);

        return employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));
    }

    private Employee deactivateEmployee(
            Long employeeId,
            LifecycleActionRequest request,
            EmployeeActionType actionType,
            String reason
    ) {
        Employee employee = requireActiveEmployee(employeeId);

        closeCurrentPostings(employee, request.getActionDate());

        employee.setStatus(EmployeeStatus.INACTIVE);
        employeeRepository.save(employee);

        employeeActionService.recordAction(
                employee,
                actionType,
                request.getActionDate(),
                employee.getDesignation(),
                null,
                null,
                null,
                reason,
                request.getRemarks(),
                workplaceFromEmployee(employee)
        );

        employeeActionService.recalculateEmployeeState(employeeId);

        return employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));
    }

    private ActionWorkplaceFields workplaceFromEmployee(Employee employee) {
        if (employee.getCurrentDepartment() == null || employee.getCurrentDepartment().isBlank()) {
            throw new RuntimeException("Employee current department is not set");
        }
        if (employee.getCurrentOffice() == null || employee.getCurrentOffice().isBlank()) {
            throw new RuntimeException("Employee current office is not set");
        }
        return ActionWorkplaceFields.of(
                DepartmentConstants.normalize(employee.getCurrentDepartment()),
                employee.getCurrentOffice().trim()
        );
    }

    private void validateConfirmationDate(
            Employee employee,
            LocalDate confirmationDate
    ) {
        LocalDate probationEndDate =
                careerProgressionService.getThreeYearRequirementDate(employee);
        if (probationEndDate != null
                && confirmationDate.isBefore(probationEndDate)) {
            throw new RuntimeException(
                    "Confirmation date cannot be earlier than "
                            + probationEndDate
                            + ". The employee must complete the 3-year "
                            + "probation period from the first appointment date."
            );
        }
    }

    private Employee requireActiveEmployee(Long employeeId) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() ->
                        new RuntimeException("Employee not found"));

        if (employee.getStatus() != EmployeeStatus.ACTIVE) {
            throw new RuntimeException(
                    "Action is only allowed for active employees"
            );
        }

        return employee;
    }

    private void closeCurrentPostings(Employee employee, LocalDate endDate) {
        postingRepository.findByEmployeeId(employee.getId())
                .stream()
                .filter(posting -> Boolean.TRUE.equals(posting.getCurrentPosting()))
                .forEach(posting -> {
                    posting.setCurrentPosting(false);
                    posting.setEndDate(endDate);
                    postingRepository.save(posting);
                });
    }

    private void validatePromotionServiceBoundary(
            Designation currentDesignation,
            Designation newDesignation
    ) {
        if (currentDesignation == null
                || currentDesignation.getService() == null
                || newDesignation == null
                || newDesignation.getService() == null) {
            throw new RuntimeException(
                    "Promotion can only be made to a designation within the same service."
            );
        }

        if (!currentDesignation
                .getService()
                .getId()
                .equals(newDesignation.getService().getId())) {
            throw new RuntimeException(
                    "Promotion can only be made to a designation within the same service."
            );
        }
    }

    private void applyPromotionRequirements(
            Employee employee,
            PromotionRequest request
    ) {
        if (request.getRequirements() != null) {
            request.getRequirements()
                    .stream()
                    .filter(requirement ->
                            requirement.getRequirementType() != null
                    )
                    .forEach(requirement -> upsertRequirement(
                            employee,
                            requirement.getRequirementType(),
                            requirement.getStatus() != null
                                    ? requirement.getStatus()
                                    : RequirementStatus.PENDING,
                            requirement.getRequirementName(),
                            requirement.getCompletedDate(),
                            requirement.getRemarks()
                    ));
            return;
        }

        setRequirementStatus(
                employee,
                RequirementType.EB_GRADE_2,
                request.getEbGrade2Passed()
        );
    }

    private void setRequirementStatus(
            Employee employee,
            RequirementType type,
            Boolean completed
    ) {
        upsertRequirement(
                employee,
                type,
                Boolean.TRUE.equals(completed)
                        ? RequirementStatus.COMPLETED
                        : RequirementStatus.PENDING,
                null,
                Boolean.TRUE.equals(completed) ? LocalDate.now() : null,
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

        if (requirement.getStatus() == RequirementStatus.COMPLETED
                && status == RequirementStatus.PENDING
                && !allowsRequirementDowngrade(employee, type)) {
            return;
        }

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

    private boolean allowsRequirementDowngrade(
            Employee employee,
            RequirementType type
    ) {
        if (employee.getEmploymentType() != EmploymentType.PERMANENT) {
            return false;
        }

        Grade grade = employee.getGrade() != null ? employee.getGrade() : Grade.NONE;
        boolean confirmedPermanent = employee.getCareerProgression() != null
                && employee.getCareerProgression().getPermanentConfirmationDate()
                        != null;

        if (isGrade1RequirementType(type)) {
            return grade == Grade.II
                    || grade == Grade.I
                    || grade == Grade.SUPRA
                    || grade == Grade.SPECIAL;
        }

        if (isGrade2RequirementType(type)) {
            return grade == Grade.III && confirmedPermanent;
        }

        if (isPermanentRequirementType(type)) {
            return grade == Grade.III && !confirmedPermanent;
        }

        return false;
    }

    private boolean isPermanentRequirementType(RequirementType type) {
        return type == RequirementType.EB_GRADE_3
                || type == RequirementType.GOVERNMENT_LANGUAGE_QUALIFICATION
                || type == RequirementType.MEDICAL_REPORT
                || type == RequirementType.OL_CERTIFICATE
                || type == RequirementType.AL_CERTIFICATE
                || type == RequirementType.DEGREE_CERTIFICATE
                || type == RequirementType.BIRTH_CERTIFICATE
                || type == RequirementType.CUSTOM_PERMANENT_REQUIREMENT;
    }

    private boolean isGrade2RequirementType(RequirementType type) {
        return type == RequirementType.EB_GRADE_2
                || type == RequirementType.CUSTOM_GRADE_2_REQUIREMENT;
    }

    private boolean isGrade1RequirementType(RequirementType type) {
        return type == RequirementType.EB_GRADE_1
                || type == RequirementType.CUSTOM_GRADE_1_REQUIREMENT;
    }
}
