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
import com.nwpengdep.hrms.dto.TrainingAppointmentRequest;
import com.nwpengdep.hrms.dto.TrainingRevertSnapshot;
import com.nwpengdep.hrms.dto.TransferOutRequest;
import com.nwpengdep.hrms.dto.VacationOfPostRequest;
import com.nwpengdep.hrms.entity.Designation;
import com.nwpengdep.hrms.entity.District;
import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.entity.EmployeeAction;
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
import com.nwpengdep.hrms.entity.ServiceType;
import com.nwpengdep.hrms.repository.DesignationRepository;
import com.nwpengdep.hrms.repository.EmployeeActionRepository;
import com.nwpengdep.hrms.repository.EmployeePostingRepository;
import com.nwpengdep.hrms.repository.EmployeeRepository;
import com.nwpengdep.hrms.util.EmployeePendingUtil;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class EmployeeLifecycleService {

    private final EmployeeRepository employeeRepository;
    private final EmployeeActionRepository employeeActionRepository;
    private final DesignationRepository designationRepository;
    private final EmployeePostingRepository postingRepository;
    private final DesignationAssignmentValidator designationAssignmentValidator;
    private final EmployeeActionService employeeActionService;
    private final ServiceLevelService serviceLevelService;
    private final CareerProgressionService careerProgressionService;
    private final EmployeeRequirementSyncService requirementSyncService;
    private final OfficeService officeService;
    private final TrainingGraduationService trainingGraduationService;

    @Transactional
    public Employee transferOut(Long employeeId, TransferOutRequest request) {
        Employee employee = requireActiveEmployee(employeeId);
        rejectContractEmploymentActions(employee);
        rejectSystemPendingEmployee(employee);

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

        Designation oldDesignation = employee.getDesignation();
        ServiceType employeeService = oldDesignation != null
                && oldDesignation.getService() != null
                ? oldDesignation.getService()
                : employee.getService();
        if (employeeService == null) {
            throw new RuntimeException("Employee service is not configured");
        }

        boolean isCatalogTransfer = request.getNewDesignationId() != null;
        boolean isCustomTransfer = request.getRecordedDesignationName() != null
                && !request.getRecordedDesignationName().isBlank();
        if (isCatalogTransfer == isCustomTransfer) {
            throw new RuntimeException(
                    "Provide exactly one of a catalog designation or a custom title"
            );
        }

        Designation targetDesignation = null;
        String targetRecordedName = null;
        String targetSpecialName = null;
        if (isCatalogTransfer) {
            targetDesignation = designationRepository.findById(request.getNewDesignationId())
                    .orElseThrow(() -> new RuntimeException("Designation not found"));
            validatePromotionServiceBoundary(
                    oldDesignation,
                    targetDesignation,
                    employeeService
            );
            targetSpecialName = normalizeSpecialDesignationName(request.getSpecialDesignationName());
            validateSpecialDesignationRequest(request.getSpecialDesignationName(), true);
        } else {
            targetRecordedName = request.getRecordedDesignationName().trim();
            validateSpecialDesignationRequest(request.getSpecialDesignationName(), false);
        }

        ServiceLevel targetServiceLevel =
                serviceLevelService.resolve(request.getServiceLevelId());

        if (isCatalogTransfer) {
            employee.setServiceLevel(targetServiceLevel);
            designationAssignmentValidator.validate(employee, targetDesignation);
        } else {
            designationAssignmentValidator.validateCustomAssignment(
                    employee.getGrade(),
                    targetServiceLevel.getId(),
                    employeeService
            );
        }

        employee.setServiceLevel(targetServiceLevel);
        employeeRepository.save(employee);

        employeeActionService.recordPairedTransferOut(
                employee,
                request.getTransferDate(),
                oldDesignation,
                targetDesignation,
                targetRecordedName,
                targetSpecialName,
                targetServiceLevel,
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
        rejectContractEmploymentActions(employee);
        rejectSystemPendingEmployee(employee);

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
        rejectContractEmploymentActions(employee);
        rejectSystemPendingEmployee(employee);

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
    public Employee graduateTrainingToPermanent(
            Long employeeId,
            TrainingAppointmentRequest request
    ) {
        Employee employee = requireActiveEmployee(employeeId);
        if (!com.nwpengdep.hrms.util.EmployeeTrainingUtil.isTrainingEmployee(employee)) {
            throw new RuntimeException(
                    "This action is only available for training employees"
            );
        }

        if (!com.nwpengdep.hrms.util.TrainingGraduationRequirements.areSatisfied(
                employee,
                request.getAppointmentDate()
        )) {
            String message = com.nwpengdep.hrms.util.TrainingGraduationRequirements
                    .graduationBlockMessage(employee);
            throw new RuntimeException(
                    message != null
                            ? message
                            : "Training graduation requirements are not satisfied"
            );
        }

        Designation designation = employee.getDesignation();
        if (designation == null) {
            throw new RuntimeException("Employee designation is not set");
        }
        if (designation.getService() == null) {
            throw new RuntimeException(
                    "Employee designation service is not configured"
            );
        }

        ServiceLevel serviceLevel =
                serviceLevelService.resolve(request.getServiceLevelId());
        if (com.nwpengdep.hrms.util.EmployeeTrainingUtil.isTrainingServiceLevel(
                serviceLevel
        )) {
            throw new RuntimeException(
                    "Permanent appointment requires a non-training service level"
            );
        }

        officeService.validateNwpWorkplaceIfNwp(
                request.getDepartment(),
                request.getOffice(),
                request.getDistrict()
        );

        LocalDate appointmentDate = request.getAppointmentDate();
        if (employee.getReportedDateToPresentWorkingPlace() != null
                && appointmentDate.isBefore(
                        employee.getReportedDateToPresentWorkingPlace()
                )) {
            throw new RuntimeException(
                    "Appointment date cannot be earlier than the reported date "
                            + "to present working place"
            );
        }

        TrainingRevertSnapshot revertSnapshot =
                trainingGraduationService.captureSnapshot(employee);

        employee.setEmploymentType(EmploymentType.PERMANENT);
        employee.setGrade(Grade.III);
        employee.setServiceLevel(serviceLevel);
        employee.setService(designation.getService());
        employee.setPermanentStatus(null);
        designationAssignmentValidator.validate(employee, designation);
        employeeRepository.save(employee);

        requirementSyncService.syncEmployeeRequirements(employee);

        EmployeeAction graduationAction = employeeActionService.recordAction(
                employee,
                EmployeeActionType.NEW_APPOINTMENT,
                appointmentDate,
                null,
                designation,
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
        graduationAction.setTrainingGraduation(true);
        employeeActionService.saveAction(graduationAction);
        trainingGraduationService.attachGraduationAction(
                employee,
                graduationAction,
                revertSnapshot
        );

        employeeActionService.recalculateEmployeeState(employeeId);

        employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));
        employee.setDateOfFirstAppointment(appointmentDate);
        employee.setAppointmentDateToPresentClassGrade(appointmentDate);
        requirementSyncService.syncEmployeeRequirements(employee);
        careerProgressionService.recalculateEmployeeCareer(employee);

        return employeeRepository.save(employee);
    }

    @Transactional
    public Employee revertTrainingGraduation(Long employeeId) {
        return trainingGraduationService.revertTrainingGraduation(employeeId);
    }

    @Transactional
    public Employee promoteEmployee(Long employeeId, PromotionRequest request) {
        Employee employee = requireActiveEmployee(employeeId);
        rejectContractEmploymentActions(employee);
        rejectSystemPendingEmployee(employee);
        Designation oldDesignation = employee.getDesignation();
        Grade oldGrade = employee.getGrade();
        ServiceLevel oldServiceLevel = employee.getServiceLevel();

        boolean isCatalogPromotion = request.getNewDesignationId() != null;
        boolean isCustomPromotion = request.getRecordedDesignationName() != null
                && !request.getRecordedDesignationName().isBlank();
        if (isCatalogPromotion == isCustomPromotion) {
            throw new RuntimeException(
                    "Provide exactly one of a catalog designation or a custom title"
            );
        }

        ServiceType employeeService = oldDesignation != null
                && oldDesignation.getService() != null
                ? oldDesignation.getService()
                : employee.getService();
        if (employeeService == null) {
            throw new RuntimeException("Employee service is not configured");
        }

        Designation targetDesignation = null;
        String targetRecordedName = null;
        String targetSpecialName = null;
        if (isCatalogPromotion) {
            targetDesignation = designationRepository.findById(request.getNewDesignationId())
                    .orElseThrow(() -> new RuntimeException("Designation not found"));
            validatePromotionServiceBoundary(
                    oldDesignation,
                    targetDesignation,
                    employeeService
            );
            targetSpecialName = normalizeSpecialDesignationName(request.getSpecialDesignationName());
            validateSpecialDesignationRequest(request.getSpecialDesignationName(), true);
        } else {
            targetRecordedName = request.getRecordedDesignationName().trim();
            validateSpecialDesignationRequest(request.getSpecialDesignationName(), false);
        }

        ServiceLevel targetServiceLevel =
                serviceLevelService.resolve(request.getServiceLevelId());

        EmployeeCareerProgression careerProgression =
                careerProgressionService.ensureCareerProgression(employee);
        applyPromotionRequirements(employee, request);
        requirementSyncService.syncEmployeeRequirements(employee);
        careerProgression.setGrade2RequiredYears(employeeService.getGrade2RequiredYears());
        careerProgression.setGrade1RequiredYears(employeeService.getGrade1RequiredYears());
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

        if (oldGrade == Grade.I
                && request.getGrade() == Grade.SUPRA
                && !careerProgressionService.isQualifiedForSupraOn(
                        employee,
                        request.getPromotionDate()
                )) {
            throw new RuntimeException(
                    "This employee has not yet qualified for Supra promotion."
            );
        }

        if (oldGrade == Grade.I
                && request.getGrade() == Grade.SPECIAL
                && !careerProgressionService.isQualifiedForSpecialOn(
                        employee,
                        request.getPromotionDate()
                )) {
            throw new RuntimeException(
                    "This employee has not yet qualified for Special promotion."
            );
        }

        employee.setGrade(request.getGrade());
        employee.setServiceLevel(targetServiceLevel);

        if (isCatalogPromotion) {
            designationAssignmentValidator.validate(employee, targetDesignation);
        } else {
            designationAssignmentValidator.validateCustomAssignment(
                    request.getGrade(),
                    request.getServiceLevelId(),
                    employeeService
            );
        }

        boolean designationChanged;
        if (isCatalogPromotion) {
            designationChanged = oldDesignation == null
                    || !oldDesignation.getId().equals(targetDesignation.getId());
        } else {
            String oldRecordedName = employee.getRecordedDesignationName();
            designationChanged = oldDesignation != null
                    || oldRecordedName == null
                    || !oldRecordedName.equalsIgnoreCase(targetRecordedName);
        }
        boolean gradeChanged = oldGrade != request.getGrade();
        boolean serviceLevelChanged = oldServiceLevel == null
                || !oldServiceLevel.getId().equals(targetServiceLevel.getId());
        boolean specialDesignationChanged = isCatalogPromotion
                && !java.util.Objects.equals(
                        normalizeComparableSpecialName(targetSpecialName),
                        normalizeComparableSpecialName(employee.getSpecialDesignationName())
                );
        String oldSpecialDesignationName = employee.getSpecialDesignationName();

        if (gradeChanged) {
            employee.setAppointmentDateToPresentClassGrade(request.getPromotionDate());
        }

        if (!designationChanged
                && !gradeChanged
                && !serviceLevelChanged
                && !specialDesignationChanged) {
            careerProgressionService.recalculateEmployeeCareer(employee);
            return employeeRepository.save(employee);
        }

        if (designationChanged) {
            closeCurrentPostings(employee, request.getPromotionDate());
        }

        employee.setDesignation(targetDesignation);
        employee.setRecordedDesignationName(
                isCustomPromotion ? targetRecordedName : null
        );
        employee.setSpecialDesignationName(
                isCatalogPromotion ? targetSpecialName : null
        );
        if (targetDesignation != null && targetDesignation.getService() != null) {
            employee.setService(targetDesignation.getService());
        }
        requirementSyncService.syncEmployeeRequirements(employee);
        if (gradeChanged) {
            requirementSyncService.completeRequirementsForGradePromotion(
                    employee,
                    oldGrade,
                    request.getGrade(),
                    request.getPromotionDate()
            );
        }
        careerProgressionService.recalculateEmployeeCareer(employee);
        employeeRepository.save(employee);

        if (designationChanged && targetDesignation != null) {
            EmployeePosting newPosting = EmployeePosting.builder()
                    .employee(employee)
                    .designation(targetDesignation)
                    .startDate(request.getPromotionDate())
                    .currentPosting(true)
                    .build();

            postingRepository.save(newPosting);
        }

        ActionWorkplaceFields promotionWorkplace = resolvePromotionWorkplace(
                employee,
                designationChanged,
                request
        );

        if (designationChanged && gradeChanged) {
            String gradeUpdateRecordedName = null;
            String gradeUpdateSpecialName = null;
            if (isCustomPromotion || oldDesignation == null) {
                gradeUpdateRecordedName = employee.getRecordedDesignationName() != null
                        ? employee.getRecordedDesignationName().trim()
                        : null;
            } else {
                gradeUpdateSpecialName = oldDesignation != null
                        && targetDesignation != null
                        && oldDesignation.getId().equals(targetDesignation.getId())
                        ? oldSpecialDesignationName
                        : null;
            }

            recordAssignmentGradeUpdateAtCurrentPost(
                    employee,
                    request.getPromotionDate(),
                    oldDesignation,
                    gradeUpdateRecordedName,
                    gradeUpdateSpecialName,
                    oldGrade,
                    request.getGrade(),
                    workplaceFromEmployee(employee)
            );

            employeeActionService.recordActionWithGrades(
                    employee,
                    EmployeeActionType.PROMOTION,
                    request.getPromotionDate(),
                    oldDesignation,
                    targetDesignation,
                    targetRecordedName,
                    targetSpecialName,
                    request.getGrade(),
                    request.getGrade(),
                    null,
                    null,
                    null,
                    request.getRemarks(),
                    promotionWorkplace
            );
        } else if (designationChanged || specialDesignationChanged) {
            employeeActionService.recordActionWithGrades(
                    employee,
                    EmployeeActionType.PROMOTION,
                    request.getPromotionDate(),
                    oldDesignation,
                    targetDesignation,
                    targetRecordedName,
                    targetSpecialName,
                    oldGrade,
                    request.getGrade(),
                    null,
                    null,
                    null,
                    request.getRemarks(),
                    promotionWorkplace
            );
        } else {
            employeeActionService.recordActionWithGrades(
                    employee,
                    EmployeeActionType.ASSIGNMENT_GRADE_UPDATE,
                    request.getPromotionDate(),
                    oldDesignation,
                    targetDesignation,
                    targetRecordedName,
                    targetSpecialName,
                    oldGrade,
                    request.getGrade(),
                    null,
                    null,
                    null,
                    request.getRemarks(),
                    promotionWorkplace
            );
        }

        employeeActionService.recalculateEmployeeState(employeeId);

        return employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));
    }

    @Transactional
    public Employee retireEmployee(Long employeeId, LifecycleActionRequest request) {
        Employee employee = requireActiveEmployee(employeeId);
        rejectContractEmploymentActions(employee);
        rejectSystemPendingEmployee(employee);
        return deactivateEmployee(
                employeeId,
                request,
                EmployeeActionType.RETIREMENT_OR_RESIGNATION,
                null
        );
    }

    @Transactional
    public Employee markDeath(Long employeeId, LifecycleActionRequest request) {
        Employee employee = requireActiveEmployee(employeeId);
        rejectSystemPendingEmployee(employee);
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
        rejectSystemPendingEmployee(employee);

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
    public Employee vacatePostEmployee(Long employeeId, VacationOfPostRequest request) {
        Employee employee = requireActiveEmployee(employeeId);
        rejectSystemPendingEmployee(employee);

        closeCurrentPostings(employee, request.getActionDate());

        employee.setStatus(EmployeeStatus.INACTIVE);
        employeeRepository.save(employee);

        employeeActionService.recordAction(
                employee,
                EmployeeActionType.VACATION_OF_POST,
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
        rejectContractEmploymentActions(employee);
        rejectSystemPendingEmployee(employee);

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

    private void recordAssignmentGradeUpdateAtCurrentPost(
            Employee employee,
            LocalDate actionDate,
            Designation designation,
            String recordedDesignationName,
            String specialDesignationName,
            Grade oldGrade,
            Grade newGrade,
            ActionWorkplaceFields workplace
    ) {
        employeeActionService.recordActionWithGrades(
                employee,
                EmployeeActionType.ASSIGNMENT_GRADE_UPDATE,
                actionDate,
                designation,
                designation,
                recordedDesignationName,
                specialDesignationName,
                oldGrade,
                newGrade,
                null,
                null,
                null,
                null,
                workplace
        );
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

    private ActionWorkplaceFields resolvePromotionWorkplace(
            Employee employee,
            boolean designationChanged,
            PromotionRequest request
    ) {
        ActionWorkplaceFields current = workplaceFromEmployee(employee);
        boolean transferringOut = Boolean.TRUE.equals(request.getTransferringOut());

        if (!designationChanged) {
            if (transferringOut) {
                throw new RuntimeException(
                        "Transfer out is only available when the designation changes"
                );
            }
            return current;
        }

        if (!transferringOut) {
            if (request.getToDepartment() != null
                    || request.getToOffice() != null
                    || request.getToDistrict() != null) {
                throw new RuntimeException(
                        "Destination workplace is only required when transferring out"
                );
            }
            return current;
        }

        if (!DepartmentConstants.isNwpEngineering(current.getDepartment())) {
            throw new RuntimeException(
                    "Transfer out on promotion is only available for employees "
                            + "in N.W.P. Engineering Department"
            );
        }

        if (request.getToDepartment() == null || request.getToDepartment().isBlank()) {
            throw new RuntimeException("Destination department is required");
        }
        if (request.getToOffice() == null || request.getToOffice().isBlank()) {
            throw new RuntimeException("Destination office is required");
        }

        String normalizedDestination = DepartmentConstants.normalize(
                request.getToDepartment().trim()
        );
        if (DepartmentConstants.isNwpEngineering(normalizedDestination)) {
            throw new RuntimeException(
                    "Use \"Stays in department\" when the employee remains in "
                            + DepartmentConstants.NWP_ENGINEERING
            );
        }

        officeService.validateNwpWorkplaceIfNwp(
                normalizedDestination,
                request.getToOffice(),
                request.getToDistrict()
        );

        return ActionWorkplaceFields.builder()
                .fromDepartment(current.getDepartment())
                .fromOffice(current.getOffice())
                .department(normalizedDestination)
                .office(request.getToOffice().trim())
                .toDepartment(normalizedDestination)
                .toOffice(request.getToOffice().trim())
                .district(
                        DepartmentConstants.isNwpEngineering(normalizedDestination)
                                ? request.getToDistrict()
                                : null
                )
                .build();
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

    private void rejectContractEmploymentActions(Employee employee) {
        if (employee.getEmploymentType() == EmploymentType.CONTRACT) {
            throw new RuntimeException(
                    "This action is not available for contract employees"
            );
        }
        if (com.nwpengdep.hrms.util.EmployeeTrainingUtil.isTrainingEmployee(employee)) {
            throw new RuntimeException(
                    "This action is not available for training employees"
            );
        }
    }

    private void rejectSystemPendingEmployee(Employee employee) {
        if (EmployeePendingUtil.isSystemPending(
                employee,
                employeeActionRepository.existsActiveActionsByEmployeeId(employee.getId())
        )) {
            throw new RuntimeException(
                    "Complete career history before recording lifecycle actions."
            );
        }
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
            Designation newDesignation,
            ServiceType employeeService
    ) {
        Long currentServiceId = currentDesignation != null
                && currentDesignation.getService() != null
                ? currentDesignation.getService().getId()
                : employeeService != null ? employeeService.getId() : null;

        if (currentServiceId == null
                || newDesignation == null
                || newDesignation.getService() == null) {
            throw new RuntimeException(
                    "Promotion can only be made to a designation within the same service."
            );
        }

        if (!currentServiceId.equals(newDesignation.getService().getId())) {
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

        if (isSupraRequirementType(type)) {
            return grade == Grade.I || grade == Grade.SUPRA;
        }

        if (isSpecialRequirementType(type)) {
            return grade == Grade.I || grade == Grade.SPECIAL;
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

    private boolean isSupraRequirementType(RequirementType type) {
        return type == RequirementType.SUPRA_REQUIREMENT
                || type == RequirementType.CUSTOM_SUPRA_REQUIREMENT;
    }

    private boolean isSpecialRequirementType(RequirementType type) {
        return type == RequirementType.MASTERS_DEGREE
                || type == RequirementType.CUSTOM_SPECIAL_REQUIREMENT;
    }

    private String normalizeSpecialDesignationName(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private String normalizeComparableSpecialName(String value) {
        String normalized = normalizeSpecialDesignationName(value);
        return normalized == null ? null : normalized.toLowerCase();
    }

    private void validateSpecialDesignationRequest(
            String specialDesignationName,
            boolean catalogAssignment
    ) {
        if (specialDesignationName != null
                && !specialDesignationName.isBlank()
                && !catalogAssignment) {
            throw new RuntimeException(
                    "Special designation cannot be used with Other/custom title"
            );
        }
    }
}
