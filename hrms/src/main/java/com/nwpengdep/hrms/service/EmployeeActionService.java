package com.nwpengdep.hrms.service;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;

import org.springframework.stereotype.Service;

import com.nwpengdep.hrms.constants.DepartmentConstants;
import com.nwpengdep.hrms.dto.ActionWorkplaceFields;
import com.nwpengdep.hrms.dto.CareerHistoryEventRequest;
import com.nwpengdep.hrms.dto.EmployeeActionResponse;
import com.nwpengdep.hrms.dto.EmployeeActionUpdateRequest;
import com.nwpengdep.hrms.entity.Designation;
import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.entity.EmployeeAction;
import com.nwpengdep.hrms.entity.EmployeeActionType;
import com.nwpengdep.hrms.entity.EmployeeCareerProgression;
import com.nwpengdep.hrms.entity.EmployeePosting;
import com.nwpengdep.hrms.entity.EmployeeStatus;
import com.nwpengdep.hrms.entity.Grade;
import com.nwpengdep.hrms.entity.ServiceLevel;
import com.nwpengdep.hrms.repository.DesignationRepository;
import com.nwpengdep.hrms.repository.EmployeeActionRepository;
import com.nwpengdep.hrms.repository.EmployeePostingRepository;
import com.nwpengdep.hrms.repository.EmployeeRepository;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class EmployeeActionService {

    private final EmployeeActionRepository employeeActionRepository;
    private final EmployeeRepository employeeRepository;
    private final DesignationRepository designationRepository;
    private final EmployeePostingRepository postingRepository;
    private final ServiceLevelService serviceLevelService;
    private final CareerProgressionService careerProgressionService;
    private final EmployeeRequirementSyncService requirementSyncService;
    private final OfficeService officeService;
    private final CurrentUserService currentUserService;
    private final TrainingGraduationService trainingGraduationService;
    private final ServiceAppointmentService serviceAppointmentService;
    private final CareerHistoryValidator careerHistoryValidator;

    public EmployeeAction recordAction(
            Employee employee,
            EmployeeActionType actionType,
            LocalDate actionDate,
            Designation oldDesignation,
            Designation newDesignation,
            String transferredFrom,
            String transferredTo,
            String reason,
            String remarks,
            ActionWorkplaceFields workplace
    ) {
        return recordActionWithGrades(
                employee,
                actionType,
                actionDate,
                oldDesignation,
                newDesignation,
                null,
                null,
                null,
                transferredFrom,
                transferredTo,
                reason,
                remarks,
                workplace
        );
    }

    public EmployeeAction recordActionWithGrades(
            Employee employee,
            EmployeeActionType actionType,
            LocalDate actionDate,
            Designation oldDesignation,
            Designation newDesignation,
            Grade oldGrade,
            Grade newGrade,
            String transferredFrom,
            String transferredTo,
            String reason,
            String remarks,
            ActionWorkplaceFields workplace
    ) {
        return recordActionWithGrades(
                employee,
                actionType,
                actionDate,
                oldDesignation,
                newDesignation,
                null,
                null,
                oldGrade,
                newGrade,
                transferredFrom,
                transferredTo,
                reason,
                remarks,
                workplace
        );
    }

    public EmployeeAction recordActionWithGrades(
            Employee employee,
            EmployeeActionType actionType,
            LocalDate actionDate,
            Designation oldDesignation,
            Designation newDesignation,
            String recordedNewDesignationName,
            Grade oldGrade,
            Grade newGrade,
            String transferredFrom,
            String transferredTo,
            String reason,
            String remarks,
            ActionWorkplaceFields workplace
    ) {
        return recordActionWithGrades(
                employee,
                actionType,
                actionDate,
                oldDesignation,
                newDesignation,
                recordedNewDesignationName,
                null,
                oldGrade,
                newGrade,
                transferredFrom,
                transferredTo,
                reason,
                remarks,
                workplace
        );
    }

    public EmployeeAction recordActionWithGrades(
            Employee employee,
            EmployeeActionType actionType,
            LocalDate actionDate,
            Designation oldDesignation,
            Designation newDesignation,
            String recordedNewDesignationName,
            String recordedSpecialDesignationName,
            Grade oldGrade,
            Grade newGrade,
            String transferredFrom,
            String transferredTo,
            String reason,
            String remarks,
            ActionWorkplaceFields workplace
    ) {
        validateSequentialActionDate(employee.getId(), actionDate);

        EmployeeAction action = EmployeeAction.builder()
                .employee(employee)
                .actionType(actionType)
                .actionDate(actionDate)
                .oldDesignation(oldDesignation)
                .newDesignation(newDesignation)
                .recordedNewDesignationName(recordedNewDesignationName)
                .recordedSpecialDesignationName(
                        normalizeSpecialDesignationName(recordedSpecialDesignationName)
                )
                .oldGrade(oldGrade)
                .newGrade(newGrade)
                .serviceId(newDesignation != null && newDesignation.getService() != null ? newDesignation.getService().getId()
                        : employee.getService() != null ? employee.getService().getId() : null)
                .serviceLevelId(newDesignation != null && newDesignation.getServiceLevel() != null ? newDesignation.getServiceLevel().getId()
                        : employee.getServiceLevel() != null ? employee.getServiceLevel().getId() : null)
                .transferredFrom(transferredFrom)
                .transferredTo(transferredTo)
                .reason(reason)
                .remarks(remarks)
                .build();

        applyWorkplaceFields(action, workplace);
        return employeeActionRepository.save(action);
    }

    public EmployeeAction saveAction(EmployeeAction action) {
        return employeeActionRepository.save(action);
    }

    @Transactional
    public EmployeeAction[] recordPairedTransferOut(
            Employee employee,
            LocalDate transferDate,
            Designation oldDesignation,
            Designation newDesignation,
            String recordedNewDesignationName,
            String recordedSpecialDesignationName,
            ServiceLevel newServiceLevel,
            String fromDepartment,
            String fromOffice,
            String toDepartment,
            String toOffice,
            String toDistrict,
            String remarks
    ) {
        String normalizedFromDept = DepartmentConstants.normalize(fromDepartment);
        String normalizedToDept = DepartmentConstants.normalize(toDepartment);

        if (normalizedFromDept != null && normalizedFromDept.equals(normalizedToDept)) {
            throw new RuntimeException(
                    "Transfer out requires a different department. "
                            + "Use Office Change to update office within the same department."
            );
        }

        officeService.validateNwpWorkplaceIfNwp(normalizedToDept, toOffice, toDistrict);

        String actionDistrict = DepartmentConstants.isNwpEngineering(normalizedToDept)
                ? toDistrict
                : null;

        EmployeeAction transferOut = recordActionWithGrades(
                employee,
                EmployeeActionType.TRANSFER_OUT,
                transferDate,
                oldDesignation,
                newDesignation,
                recordedNewDesignationName,
                recordedSpecialDesignationName,
                null,
                null,
                normalizedFromDept,
                normalizedToDept,
                null,
                remarks,
                ActionWorkplaceFields.builder()
                        .department(normalizedToDept)
                        .office(toOffice.trim())
                        .fromDepartment(normalizedFromDept)
                        .fromOffice(fromOffice.trim())
                        .toDepartment(normalizedToDept)
                        .toOffice(toOffice.trim())
                        .district(actionDistrict)
                        .build()
        );

        EmployeeAction transferIn = recordActionWithGrades(
                employee,
                EmployeeActionType.TRANSFER_IN,
                transferDate,
                null,
                newDesignation,
                recordedNewDesignationName,
                recordedSpecialDesignationName,
                null,
                null,
                normalizedFromDept,
                null,
                null,
                remarks,
                ActionWorkplaceFields.builder()
                        .department(normalizedToDept)
                        .office(toOffice.trim())
                        .fromDepartment(normalizedFromDept)
                        .fromOffice(fromOffice.trim())
                        .district(actionDistrict)
                        .linkedActionId(transferOut.getId())
                        .build()
        );

        transferOut.setLinkedActionId(transferIn.getId());
        employeeActionRepository.save(transferOut);

        if (newServiceLevel != null) {
            employee.setServiceLevel(newServiceLevel);
            employeeRepository.save(employee);
        }

        recalculateEmployeeState(employee.getId());
        return new EmployeeAction[] { transferOut, transferIn };
    }

    public String historyRevision(Long employeeId) {
        String content = employeeActionRepository.findByEmployeeIdOrderByActionDateDescCreatedAtDesc(employeeId).stream()
                .filter(a -> !Boolean.TRUE.equals(a.getDeleted())).sorted(Comparator.comparing(EmployeeAction::getId))
                .map(a -> java.util.Arrays.asList(a.getId(), a.getActionType(), a.getActionDate(),
                        a.getNewDesignation() == null ? null : a.getNewDesignation().getId(), a.getNewGrade(),
                        a.getDepartment(), a.getOffice(), a.getDistrict(), a.getToDepartment(), a.getToOffice(),
                        a.getServiceId(), a.getServiceLevelId(), a.getServiceAppointmentKey(), a.getAppointmentBasis(),
                        a.getIncrementDate(), a.getFirstIncrementDueDate(),
                        a.getRemarks(), a.getReason(), a.getRecordedNewDesignationName(), a.getRecordedSpecialDesignationName()).toString())
                .collect(java.util.stream.Collectors.joining("\n"));
        try {
            return java.util.HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256")
                    .digest(content.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        } catch (java.security.NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }

    public void requireHistoryRevision(Long employeeId, String expected) {
        if (expected == null || !expected.equals(historyRevision(employeeId)))
            throw new com.nwpengdep.hrms.exception.ConflictException("Lifecycle history has changed. Refresh the employee and review the latest history before saving.");
    }

    public void archiveHistoryForRevision(Long employeeId) {
        for (EmployeeAction old : employeeActionRepository.findByEmployeeIdOrderByActionDateDescCreatedAtDesc(employeeId)) {
            if (!Boolean.TRUE.equals(old.getDeleted())) {
                old.setDeleted(true); old.setDeletedAt(java.time.LocalDateTime.now());
                old.setDeletedBy(currentUserService.getCurrentUsernameOrDefault("system"));
                employeeActionRepository.save(old);
            }
        }
    }

    public List<EmployeeActionResponse> getEmployeeActionHistory(Long employeeId) {
        List<EmployeeAction> actions = employeeActionRepository
                .findByEmployeeIdOrderByActionDateDescCreatedAtDesc(employeeId)
                .stream()
                .filter(action -> action.getDeleted() == null || !action.getDeleted())
                .toList();

        Long latestModifiableId = resolveLatestModifiableActionId(actions);

        return actions.stream()
                .map(action -> {
                    boolean autoCreated = action.getActionType() == EmployeeActionType.TRANSFER_IN
                            && action.getLinkedActionId() != null;
                    boolean canEdit = !autoCreated;
                    boolean canDelete = !autoCreated
                            && latestModifiableId != null
                            && latestModifiableId.equals(action.getId());
                    return toResponse(action, canEdit, canDelete);
                })
                .toList();
    }

    @Transactional
    public EmployeeAction updateEmployeeAction(
            Long actionId,
            EmployeeActionUpdateRequest request
    ) {
        EmployeeAction action = requireEditableAction(actionId);
        Employee employee = action.getEmployee();
        if (employee.getCurrentServiceAppointmentKey() != null) {
            employeeRepository.findByIdForUpdate(employee.getId()).orElseThrow();
            requireHistoryRevision(employee.getId(), request.getExpectedHistoryRevision());
            serviceAppointmentService.captureCurrent(employee);
        }

        Grade newGrade = action.getNewGrade();
        if (request.getGrade() != null) {
            newGrade = Grade.fromLabel(request.getGrade());
        }

        if (action.getActionType() == EmployeeActionType.SERVICE_APPOINTMENT
                && request.getGrade() != null
                && !"III".equals(request.getGrade())) {
            throw new IllegalArgumentException(
                    "Appointment to another service must start at Grade III"
            );
        }

        validateSequentialActionDateOnUpdate(action, request.getActionDate());
        List<CareerHistoryEventRequest> recordedTimeline =
                recordedTimelineForValidation(employee.getId());
        validateProposedTimeline(employee, action, request, newGrade);

        if (action.getActionType() == EmployeeActionType.SERVICE_APPOINTMENT) {
            action.setAppointmentBasis(request.getAppointmentBasis());
            action.setIncrementDate(request.getIncrementDate());
            action.setFirstIncrementDueDate(request.getFirstIncrementDueDate());
            if (request.getServiceLevelId() != null) {
                action.setServiceLevelId(request.getServiceLevelId());
            }
        }
        action.setActionDate(request.getActionDate());
        action.setRemarks(request.getRemarks());
        if (action.getActionType() == EmployeeActionType.PROMOTION && request.getAppointmentBasis() != null)
            action.setAppointmentBasis(request.getAppointmentBasis().trim());

        if (request.getNewDesignationId() != null) {
            Designation newDesignation = designationRepository.findById(request.getNewDesignationId())
                    .orElseThrow(() -> new RuntimeException("New designation not found"));
            action.setNewDesignation(newDesignation);
            action.setRecordedNewDesignationName(null);
            if (action.getActionType() == EmployeeActionType.SERVICE_APPOINTMENT) {
                if (newDesignation.getService() != null) {
                    action.setServiceId(newDesignation.getService().getId());
                }
                if (newDesignation.getServiceLevel() != null) {
                    action.setServiceLevelId(newDesignation.getServiceLevel().getId());
                }
            }
            if (request.getSpecialDesignationName() != null) {
                action.setRecordedSpecialDesignationName(
                        normalizeSpecialDesignationName(request.getSpecialDesignationName())
                );
            }
        } else if (request.getRecordedDesignationName() != null) {
            if (request.getRecordedDesignationName().isBlank()) {
                action.setRecordedNewDesignationName(null);
            } else {
                action.setNewDesignation(null);
                action.setRecordedNewDesignationName(
                        request.getRecordedDesignationName().trim()
                );
                action.setRecordedSpecialDesignationName(null);
            }
        } else if (request.getSpecialDesignationName() != null) {
            action.setRecordedSpecialDesignationName(
                    normalizeSpecialDesignationName(request.getSpecialDesignationName())
            );
        }

        if (action.getActionType() == EmployeeActionType.SERVICE_APPOINTMENT
                && request.getServiceId() != null) {
            action.setServiceId(request.getServiceId());
        }

        if (request.getTransferredFrom() != null) {
            action.setTransferredFrom(
                    request.getTransferredFrom().isBlank()
                            ? null
                            : request.getTransferredFrom().trim()
            );
        }

        // An office change only changes the local title when the form actually carried the field.
        if (action.getActionType() == EmployeeActionType.OFFICE_CHANGE
                && request.getSpecialDesignationName() != null) {
            action.setSpecialDesignationUpdated(true);
        }

        if (request.getDepartment() != null) {
            action.setDepartment(DepartmentConstants.normalize(request.getDepartment()));
        }
        if (request.getOffice() != null) {
            action.setOffice(request.getOffice().trim());
        }
        if (request.getToDepartment() != null) {
            String toDept = DepartmentConstants.normalize(request.getToDepartment());
            action.setToDepartment(toDept);
            action.setTransferredTo(toDept);
            if (action.getActionType() == EmployeeActionType.TRANSFER_OUT) {
                action.setDepartment(toDept);
            }
        }
        if (request.getToOffice() != null) {
            action.setToOffice(request.getToOffice().trim());
            if (action.getActionType() == EmployeeActionType.TRANSFER_OUT) {
                action.setOffice(request.getToOffice().trim());
            }
        }

        applyWorkplaceDistrictUpdate(action, request);

        if (action.getActionType() == EmployeeActionType.PROMOTION
                && request.getTransferringOut() != null) {
            applyPromotionWorkplaceUpdate(action, request);
        }

        applyReasonUpdate(action, request);
        action.setEditedBy(currentUserService.getCurrentUsernameOrDefault("system"));
        action.setEditedAt(java.time.LocalDateTime.now());

        if (request.getServiceLevelId() != null
                && action.getActionType() != EmployeeActionType.SERVICE_APPOINTMENT) {
            action.setServiceLevelId(request.getServiceLevelId());
        }

        if (action.getActionType() == EmployeeActionType.PROMOTION
                || action.getActionType() == EmployeeActionType.ASSIGNMENT_GRADE_UPDATE) {
            if (request.getGrade() != null) {
                action.setNewGrade(newGrade);
                employee.setGrade(newGrade);
            }
            if (request.getServiceLevelId() != null) {
                ServiceLevel serviceLevel = serviceLevelService.resolve(request.getServiceLevelId());
                employee.setServiceLevel(serviceLevel);
            }
            careerProgressionService.recalculateEmployeeCareer(employee);
            employeeRepository.save(employee);
        } else if (request.getServiceLevelId() != null
                && (action.getActionType() == EmployeeActionType.TRANSFER_OUT
                || action.getActionType() == EmployeeActionType.NEW_APPOINTMENT)) {
            employee.setServiceLevel(serviceLevelService.resolve(request.getServiceLevelId()));
            employeeRepository.save(employee);
        }

        employeeActionRepository.save(action);

        if (action.getActionType() == EmployeeActionType.TRANSFER_OUT
                && action.getLinkedActionId() != null) {
            syncLinkedTransferIn(action);
        }

        validateFullTimeline(action.getEmployee().getId(), recordedTimeline);
        recalculateEmployeeState(action.getEmployee().getId());
        return action;
    }

    public void deleteEmployeeAction(Long actionId) {
        deleteEmployeeAction(actionId, null);
    }

    @Transactional
    public void deleteEmployeeAction(Long actionId, String expectedHistoryRevision) {
        EmployeeAction action = employeeActionRepository.findById(actionId)
                .orElseThrow(() -> new RuntimeException("Employee action not found"));

        if (Boolean.TRUE.equals(action.getDeleted())) {
            throw new RuntimeException("This lifecycle action has already been deleted");
        }

        if (Boolean.TRUE.equals(action.getTrainingAppointment())) {
            throw new RuntimeException(
                    "Trainee appointment actions cannot be deleted independently"
            );
        }

        if (Boolean.TRUE.equals(action.getTrainingGraduation())) {
            trainingGraduationService.revertTrainingGraduation(
                    action.getEmployee().getId(),
                    action.getId()
            );
            return;
        }

        action = requireLatestModifiableAction(actionId);
        if (action.getEmployee().getCurrentServiceAppointmentKey() != null) {
            employeeRepository.findByIdForUpdate(action.getEmployee().getId()).orElseThrow();
            requireHistoryRevision(action.getEmployee().getId(), expectedHistoryRevision);
            serviceAppointmentService.captureCurrent(action.getEmployee());
        }

        if (action.getActionType() == EmployeeActionType.TRANSFER_IN) {
            throw new RuntimeException(
                    "Auto-created transfer in actions cannot be deleted independently"
            );
        }

        if (action.getLinkedActionId() != null) {
            employeeActionRepository.findById(action.getLinkedActionId())
                    .ifPresent(linked -> {
                        linked.setDeleted(true);
                        linked.setDeletedBy(currentUserService.getCurrentUsernameOrDefault("system"));
                        linked.setDeletedAt(java.time.LocalDateTime.now());
                        employeeActionRepository.save(linked);
                    });
        }

        action.setDeleted(true);
        action.setDeletedBy(currentUserService.getCurrentUsernameOrDefault("system"));
        action.setDeletedAt(java.time.LocalDateTime.now());
        employeeActionRepository.save(action);

        validateServiceAppointmentTimeline(action.getEmployee().getId());
        recalculateEmployeeState(action.getEmployee().getId());
    }

    @Transactional
    public void recalculateEmployeeState(Long employeeId) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        List<EmployeeAction> actions = employeeActionRepository
                .findByEmployeeIdOrderByActionDateDescCreatedAtDesc(employeeId)
                .stream()
                .filter(action -> action.getDeleted() == null || !action.getDeleted())
                .sorted(Comparator.comparing(EmployeeAction::getActionDate)
                        .thenComparing(EmployeeAction::getId))
                .toList();

        if (employee.getCurrentServiceAppointmentKey() != null
                || actions.stream().anyMatch(a -> a.getActionType() == EmployeeActionType.SERVICE_APPOINTMENT)) {
            serviceAppointmentService.rebuild(employee, actions);
        }
        postingRepository.deleteByEmployeeId(employeeId);

        Designation currentDesignation = null;
        String currentRecordedDesignationName = null;
        String currentSpecialDesignationName = null;
        EmployeeStatus currentStatus = EmployeeStatus.ACTIVE;
        String currentDepartment = null;
        String currentOffice = null;
        String currentDistrict = employee.getCurrentDistrictOfWorking();
        Grade currentGrade = null;
        EmployeeCareerProgression careerProgression =
                careerProgressionService.ensureCareerProgression(employee);
        careerProgression.setPermanentConfirmationDate(null);
        careerProgression.setGrade3AchievedDate(null);
        careerProgression.setGrade2AchievedDate(null);
        careerProgression.setGrade1AchievedDate(null);
        careerProgression.setSupraAchievedDate(null);
        careerProgression.setSpecialAchievedDate(null);
        LocalDate latestAppointmentDate = null;
        LocalDate reportedDateToPresentWorkingPlace = null;
        LocalDate enteredDateToNWPCouncil = null;
        String transferredFrom = null;

        for (EmployeeAction action : actions) {
            switch (action.getActionType()) {
                case SERVICE_APPOINTMENT -> {
                    boolean workplaceChanged = !java.util.Objects.equals(currentDepartment, action.getDepartment())
                            || !java.util.Objects.equals(currentOffice, action.getOffice())
                            || !java.util.Objects.equals(currentDistrict, action.getDistrict());
                    currentDesignation = action.getNewDesignation(); currentRecordedDesignationName = null;
                    currentSpecialDesignationName = null; currentGrade = Grade.III;
                    currentDepartment = action.getDepartment(); currentOffice = action.getOffice();
                    currentDistrict = resolveDistrictForDepartment(currentDepartment, action.getDistrict(), currentOffice, currentDistrict);
                    if (workplaceChanged) reportedDateToPresentWorkingPlace = action.getActionDate();
                    if (enteredDateToNWPCouncil == null && DepartmentConstants.isNwpEngineering(currentDepartment))
                        enteredDateToNWPCouncil = action.getActionDate();
                    if (action.getServiceLevelId() != null) employee.setServiceLevel(serviceLevelService.resolve(action.getServiceLevelId()));
                    careerProgression.setPermanentConfirmationDate(null); careerProgression.setGrade3AchievedDate(null);
                    careerProgression.setGrade2AchievedDate(null); careerProgression.setGrade1AchievedDate(null);
                    careerProgression.setSupraAchievedDate(null); careerProgression.setSpecialAchievedDate(null);
                    latestAppointmentDate = action.getActionDate();
                }
                case NEW_APPOINTMENT -> {
                    if (action.getNewDesignation() != null) {
                        currentDesignation = action.getNewDesignation();
                        currentRecordedDesignationName = null;
                        currentSpecialDesignationName =
                                normalizeSpecialDesignationName(
                                        action.getRecordedSpecialDesignationName()
                                );
                    } else if (action.getRecordedNewDesignationName() != null
                            && !action.getRecordedNewDesignationName().isBlank()) {
                        currentDesignation = null;
                        currentRecordedDesignationName =
                                action.getRecordedNewDesignationName().trim();
                        currentSpecialDesignationName = null;
                    }
                    currentStatus = EmployeeStatus.ACTIVE;
                    if (action.getDepartment() != null) {
                        currentDepartment = action.getDepartment();
                        currentOffice = action.getOffice();
                        currentDistrict = resolveDistrictForDepartment(
                                currentDepartment,
                                action.getDistrict(),
                                currentOffice,
                                currentDistrict
                        );
                    }
                    if (action.getNewGrade() != null) {
                        currentGrade = action.getNewGrade();
                    } else if (currentGrade == null) {
                        currentGrade = Grade.III;
                    }
                    latestAppointmentDate = action.getActionDate();
                }

                case TRANSFER_IN -> {
                    if (action.getNewDesignation() != null) {
                        currentDesignation = action.getNewDesignation();
                        currentRecordedDesignationName = null;
                        if (action.getRecordedSpecialDesignationName() != null) {
                            currentSpecialDesignationName =
                                    normalizeSpecialDesignationName(
                                            action.getRecordedSpecialDesignationName()
                                    );
                        }
                    }
                    currentStatus = EmployeeStatus.ACTIVE;
                    if (action.getDepartment() != null) {
                        currentDepartment = action.getDepartment();
                        currentOffice = action.getOffice();
                        currentDistrict = resolveDistrictForDepartment(
                                currentDepartment,
                                action.getDistrict(),
                                currentOffice,
                                currentDistrict
                        );
                    }
                    if (action.getLinkedActionId() == null) {
                        if (action.getTransferredFrom() != null
                                && !action.getTransferredFrom().isBlank()) {
                            transferredFrom = action.getTransferredFrom().trim();
                        } else if (action.getFromDepartment() != null) {
                            transferredFrom = formatWorkingPlace(
                                    action.getFromDepartment(),
                                    action.getFromOffice()
                            );
                        }
                    }
                }

                case TRANSFER_OUT -> {
                    currentStatus = EmployeeStatus.ACTIVE;
                    if (action.getNewDesignation() != null) {
                        currentDesignation = action.getNewDesignation();
                        currentRecordedDesignationName = null;
                        currentSpecialDesignationName =
                                normalizeSpecialDesignationName(
                                        action.getRecordedSpecialDesignationName()
                                );
                    } else if (action.getRecordedNewDesignationName() != null
                            && !action.getRecordedNewDesignationName().isBlank()) {
                        currentDesignation = null;
                        currentRecordedDesignationName =
                                action.getRecordedNewDesignationName().trim();
                        currentSpecialDesignationName = null;
                    }
                    if (action.getDepartment() != null) {
                        currentDepartment = action.getDepartment();
                        currentOffice = action.getOffice();
                        currentDistrict = resolveDistrictForDepartment(
                                currentDepartment,
                                action.getDistrict(),
                                currentOffice,
                                currentDistrict
                        );
                    }
                }

                case OFFICE_CHANGE -> {
                    if (action.getDepartment() != null) {
                        currentDepartment = action.getDepartment();
                        currentOffice = action.getOffice();
                        currentDistrict = resolveDistrictForDepartment(
                                currentDepartment,
                                action.getDistrict(),
                                currentOffice,
                                currentDistrict
                        );
                    }
                    // Only an office change that actually carried the field may change or clear the
                    // local title; ones recorded before the field existed must leave it alone.
                    if (Boolean.TRUE.equals(action.getSpecialDesignationUpdated())
                            && currentRecordedDesignationName == null) {
                        currentSpecialDesignationName = normalizeSpecialDesignationName(
                                action.getRecordedSpecialDesignationName()
                        );
                    }
                }

                case PROMOTION -> {
                    if (action.getNewDesignation() != null) {
                        currentDesignation = action.getNewDesignation();
                        currentRecordedDesignationName = null;
                        currentSpecialDesignationName =
                                normalizeSpecialDesignationName(
                                        action.getRecordedSpecialDesignationName()
                                );
                    } else if (action.getRecordedNewDesignationName() != null
                            && !action.getRecordedNewDesignationName().isBlank()) {
                        currentDesignation = null;
                        currentRecordedDesignationName =
                                action.getRecordedNewDesignationName().trim();
                        currentSpecialDesignationName = null;
                    }
                    if (action.getDepartment() != null) {
                        currentDepartment = action.getDepartment();
                        currentOffice = action.getOffice();
                        currentDistrict = resolveDistrictForDepartment(
                                currentDepartment,
                                action.getDistrict(),
                                currentOffice,
                                currentDistrict
                        );
                    }
                    if (action.getNewGrade() != null) {
                        currentGrade = action.getNewGrade();
                        applyGradeAchievementDates(
                                careerProgression,
                                action.getOldGrade(),
                                action.getNewGrade(),
                                action.getActionDate()
                        );
                        if (isGradePromotion(action.getOldGrade(), action.getNewGrade())) {
                            latestAppointmentDate = action.getActionDate();
                        }
                    }
                }

                case ASSIGNMENT_GRADE_UPDATE -> {
                    if (action.getNewDesignation() != null) {
                        currentDesignation = action.getNewDesignation();
                        currentRecordedDesignationName = null;
                        if (action.getRecordedSpecialDesignationName() != null) {
                            currentSpecialDesignationName =
                                    normalizeSpecialDesignationName(
                                            action.getRecordedSpecialDesignationName()
                                    );
                        }
                    } else if (action.getRecordedNewDesignationName() != null
                            && !action.getRecordedNewDesignationName().isBlank()) {
                        currentDesignation = null;
                        currentRecordedDesignationName =
                                action.getRecordedNewDesignationName().trim();
                        currentSpecialDesignationName = null;
                    }
                    if (action.getDepartment() != null) {
                        currentDepartment = action.getDepartment();
                        currentOffice = action.getOffice();
                        currentDistrict = resolveDistrictForDepartment(
                                currentDepartment,
                                action.getDistrict(),
                                currentOffice,
                                currentDistrict
                        );
                    }
                    if (action.getNewGrade() != null) {
                        currentGrade = action.getNewGrade();
                        applyGradeAchievementDates(
                                careerProgression,
                                action.getOldGrade(),
                                action.getNewGrade(),
                                action.getActionDate()
                        );
                        if (isGradePromotion(action.getOldGrade(), action.getNewGrade())) {
                            latestAppointmentDate = action.getActionDate();
                        }
                    }
                }

                case PERMANENT_CONFIRMATION -> {
                    if (action.getDepartment() != null) {
                        currentDepartment = action.getDepartment();
                        currentOffice = action.getOffice();
                        currentDistrict = resolveDistrictForDepartment(
                                currentDepartment,
                                action.getDistrict(),
                                currentOffice,
                                currentDistrict
                        );
                    }
                    careerProgression.setPermanentConfirmationDate(action.getActionDate());
                    careerProgression.setGrade3AchievedDate(action.getActionDate());
                }

                case RETIREMENT_OR_RESIGNATION, DEATH, DISMISSAL, VACATION_OF_POST -> {
                    if (action.getDepartment() != null) {
                        currentDepartment = action.getDepartment();
                        currentOffice = action.getOffice();
                        currentDistrict = resolveDistrictForDepartment(
                                currentDepartment,
                                action.getDistrict(),
                                currentOffice,
                                currentDistrict
                        );
                    }
                    currentStatus = EmployeeStatus.INACTIVE;
                }
            }

            if (isWorkplaceEstablishingAction(action)) {
                reportedDateToPresentWorkingPlace = action.getActionDate();
            }

            if (enteredDateToNWPCouncil == null && isFirstNwpJoinAction(action)) {
                enteredDateToNWPCouncil = action.getActionDate();
            }

            if (currentDesignation != null && currentStatus == EmployeeStatus.ACTIVE) {
                EmployeePosting posting = EmployeePosting.builder()
                        .employee(employee)
                        .designation(currentDesignation)
                        .startDate(action.getActionDate())
                        .currentPosting(true)
                        .build();
                postingRepository.save(posting);
            }
        }

        if (currentGrade == null && !actions.isEmpty()) {
            currentGrade = employee.getGrade();
        }

        employee.setDesignation(currentDesignation);
        if (currentDesignation != null) {
            employee.setRecordedDesignationName(null);
            employee.setSpecialDesignationName(currentSpecialDesignationName);
            if (currentDesignation.getService() != null) {
                employee.setService(currentDesignation.getService());
            }
        } else if (currentRecordedDesignationName != null) {
            employee.setRecordedDesignationName(currentRecordedDesignationName);
            employee.setSpecialDesignationName(null);
        } else {
            employee.setRecordedDesignationName(null);
            employee.setSpecialDesignationName(null);
        }
        if (currentGrade != null) {
            employee.setGrade(currentGrade);
        }
        if (employee.getCurrentServiceAppointmentKey() != null) {
            if (currentDesignation != null && currentDesignation.getServiceLevel() != null)
                employee.setServiceLevel(currentDesignation.getServiceLevel());
            else employee.getServiceAppointments().stream().filter(p -> p.isCurrentAppointment())
                    .filter(p -> p.getServiceLevelId() != null).findFirst()
                    .ifPresent(p -> employee.setServiceLevel(serviceLevelService.resolve(p.getServiceLevelId())));
        }
        employee.setStatus(currentStatus);
        employee.setCurrentDepartment(currentDepartment);
        employee.setCurrentOffice(currentOffice);
        employee.setCurrentWorkingPlace(formatWorkingPlace(currentDepartment, currentOffice));
        employee.setCurrentDistrictOfWorking(currentDistrict);
        employee.setTransferredFrom(transferredFrom);
        employee.setReportedDateToPresentWorkingPlace(reportedDateToPresentWorkingPlace);
        employee.setEnteredDateToNWPCouncil(enteredDateToNWPCouncil);
        employee.setAppointmentDateToPresentClassGrade(latestAppointmentDate);
        requirementSyncService.syncEmployeeRequirements(employee);
        requirementSyncService.completeRequirementsForAchievedGrade(employee);
        careerProgressionService.recalculateEmployeeCareer(employee);
        if (employee.getCurrentServiceAppointmentKey() != null) serviceAppointmentService.captureCurrent(employee);
        employeeRepository.save(employee);
    }

    public void validateServiceAppointmentTimeline(Long employeeId) {
        validateFullTimeline(employeeId);
    }

    /**
     * Re-validate the whole employment timeline after any edit or delete.
     * Uses CareerHistoryValidator so mid-history changes cannot break later events
     * (e.g. moving Grade II later than Grade I allows).
     */
    public List<CareerHistoryEventRequest> recordedTimelineForValidation(Long employeeId) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));
        return timelineEventsForValidation(
                employee,
                loadActiveActionsChronological(employeeId)
        );
    }

    public void validateFullTimeline(Long employeeId) {
        validateFullTimeline(employeeId, null);
    }

    private void validateFullTimeline(
            Long employeeId,
            List<CareerHistoryEventRequest> recordedBaseline
    ) {
        Employee employee = employeeRepository.findById(employeeId).orElseThrow();
        List<EmployeeAction> actions = loadActiveActionsChronological(employeeId);
        List<CareerHistoryEventRequest> filtered = timelineEventsForValidation(employee, actions);
        List<CareerHistoryEventRequest> baseline = recordedBaseline != null
                ? recordedBaseline
                : filtered;
        try {
            careerHistoryValidator.validate(filtered, baseline);
        } catch (RuntimeException ex) {
            throw new RuntimeException(clarifyTimelineValidationMessage(ex.getMessage()), ex);
        }
        if (employee.getCurrentServiceAppointmentKey() != null
                || actions.stream().anyMatch(
                        a -> a.getActionType() == EmployeeActionType.SERVICE_APPOINTMENT)) {
            serviceAppointmentService.validateHistoryRevision(employee, filtered);
        }
    }

    private void validateProposedTimeline(
            Employee employee,
            EmployeeAction target,
            EmployeeActionUpdateRequest request,
            Grade proposedGrade
    ) {
        List<EmployeeAction> actions = loadActiveActionsChronological(employee.getId());
        List<CareerHistoryEventRequest> recorded = timelineEventsForValidation(employee, actions);
        List<CareerHistoryEventRequest> events = toCareerHistoryEvents(employee, actions);
        for (int i = 0; i < actions.size(); i++) {
            if (!actions.get(i).getId().equals(target.getId())) {
                continue;
            }
            CareerHistoryEventRequest event = events.get(i);
            applyProposedFieldsToEvent(event, target, request, proposedGrade, employee);
            // Keep the paired transfer-in in sync in the simulated timeline.
            if (target.getActionType() == EmployeeActionType.TRANSFER_OUT
                    && target.getLinkedActionId() != null) {
                for (int j = 0; j < actions.size(); j++) {
                    if (actions.get(j).getId().equals(target.getLinkedActionId())) {
                        CareerHistoryEventRequest linked = events.get(j);
                        linked.setActionDate(event.getActionDate());
                        linked.setDesignationId(event.getDesignationId());
                        linked.setRecordedDesignationName(event.getRecordedDesignationName());
                        linked.setSpecialDesignationName(event.getSpecialDesignationName());
                        linked.setDepartment(event.getDepartment());
                        linked.setOffice(event.getOffice());
                        linked.setDistrict(event.getDistrict());
                        linked.setRemarks(event.getRemarks());
                        break;
                    }
                }
            }
            break;
        }
        // Drop auto transfer-in and trainee appointment rows (same filters as SA timeline).
        List<CareerHistoryEventRequest> filtered = new java.util.ArrayList<>();
        for (int i = 0; i < actions.size(); i++) {
            EmployeeAction a = actions.get(i);
            if (a.getActionType() == EmployeeActionType.TRANSFER_IN && a.getLinkedActionId() != null) {
                continue;
            }
            if (Boolean.TRUE.equals(a.getTrainingAppointment())) {
                continue;
            }
            filtered.add(events.get(i));
        }
        try {
            careerHistoryValidator.validate(filtered, recorded);
        } catch (RuntimeException ex) {
            throw new RuntimeException(clarifyTimelineValidationMessage(ex.getMessage()), ex);
        }
        if (employee.getCurrentServiceAppointmentKey() != null
                || actions.stream().anyMatch(
                        a -> a.getActionType() == EmployeeActionType.SERVICE_APPOINTMENT)) {
            serviceAppointmentService.validateHistoryRevision(employee, filtered);
        }
    }

    private List<CareerHistoryEventRequest> timelineEventsForValidation(
            Employee employee,
            List<EmployeeAction> actions
    ) {
        List<CareerHistoryEventRequest> all = toCareerHistoryEvents(employee, actions);
        List<CareerHistoryEventRequest> filtered = new java.util.ArrayList<>();
        for (int i = 0; i < actions.size(); i++) {
            EmployeeAction action = actions.get(i);
            if (action.getActionType() == EmployeeActionType.TRANSFER_IN
                    && action.getLinkedActionId() != null) {
                continue;
            }
            if (Boolean.TRUE.equals(action.getTrainingAppointment())) {
                continue;
            }
            filtered.add(all.get(i));
        }
        return filtered;
    }

    private void applyProposedFieldsToEvent(
            CareerHistoryEventRequest event,
            EmployeeAction target,
            EmployeeActionUpdateRequest request,
            Grade proposedGrade,
            Employee employee
    ) {
        event.setActionDate(request.getActionDate());
        event.setRemarks(request.getRemarks());

        if (request.getNewDesignationId() != null) {
            event.setDesignationId(request.getNewDesignationId());
            event.setRecordedDesignationName(null);
            Designation designation = designationRepository.findById(request.getNewDesignationId())
                    .orElse(null);
            if (designation != null && designation.getService() != null) {
                event.setServiceId(designation.getService().getId());
            }
            if (designation != null && designation.getServiceLevel() != null) {
                event.setServiceLevelId(designation.getServiceLevel().getId());
            }
            if (request.getSpecialDesignationName() != null) {
                event.setSpecialDesignationName(
                        normalizeSpecialDesignationName(request.getSpecialDesignationName())
                );
            }
        } else if (request.getRecordedDesignationName() != null) {
            if (!request.getRecordedDesignationName().isBlank()) {
                event.setDesignationId(null);
                event.setRecordedDesignationName(request.getRecordedDesignationName().trim());
                event.setSpecialDesignationName(null);
            }
        } else if (request.getSpecialDesignationName() != null) {
            event.setSpecialDesignationName(
                    normalizeSpecialDesignationName(request.getSpecialDesignationName())
            );
        }

        if (request.getGrade() != null) {
            event.setGrade(proposedGrade);
        }
        if (request.getServiceLevelId() != null) {
            event.setServiceLevelId(request.getServiceLevelId());
        }
        if (request.getServiceId() != null) {
            event.setServiceId(request.getServiceId());
        }
        if (request.getDepartment() != null) {
            event.setDepartment(DepartmentConstants.normalize(request.getDepartment()));
        }
        if (request.getOffice() != null) {
            event.setOffice(request.getOffice().trim());
        }
        if (request.getToDepartment() != null) {
            String toDept = DepartmentConstants.normalize(request.getToDepartment());
            event.setToDepartment(toDept);
            if (target.getActionType() == EmployeeActionType.TRANSFER_OUT
                    || (target.getActionType() == EmployeeActionType.PROMOTION
                    && Boolean.TRUE.equals(request.getTransferringOut()))) {
                event.setDepartment(toDept);
            }
        }
        if (request.getToOffice() != null) {
            event.setToOffice(request.getToOffice().trim());
            if (target.getActionType() == EmployeeActionType.TRANSFER_OUT
                    || (target.getActionType() == EmployeeActionType.PROMOTION
                    && Boolean.TRUE.equals(request.getTransferringOut()))) {
                event.setOffice(request.getToOffice().trim());
            }
        }
        String district = request.getToDistrict() != null
                ? request.getToDistrict()
                : request.getDistrict();
        if (district != null) {
            event.setDistrict(district.isBlank() ? null : district.trim());
            event.setToDistrict(event.getDistrict());
        }
        if (request.getAppointmentBasis() != null) {
            event.setAppointmentBasis(request.getAppointmentBasis());
        }
        if (request.getIncrementDate() != null) {
            event.setIncrementDate(request.getIncrementDate());
        }
        if (request.getFirstIncrementDueDate() != null) {
            event.setFirstIncrementDueDate(request.getFirstIncrementDueDate());
        }
        if (request.getReason() != null) {
            event.setReason(request.getReason().isBlank() ? null : request.getReason().trim());
        }
        if (target.getActionType() == EmployeeActionType.PROMOTION
                && request.getTransferringOut() != null) {
            event.setTransferringOut(request.getTransferringOut());
            if (Boolean.TRUE.equals(request.getTransferringOut())) {
                if (request.getToDepartment() != null) {
                    event.setDepartment(DepartmentConstants.normalize(request.getToDepartment()));
                    event.setToDepartment(event.getDepartment());
                }
                if (request.getToOffice() != null) {
                    event.setOffice(request.getToOffice().trim());
                    event.setToOffice(event.getOffice());
                }
            } else {
                event.setToDepartment(null);
                event.setToOffice(null);
                event.setTransferringOut(false);
            }
        }
        if (target.getActionType() == EmployeeActionType.OFFICE_CHANGE
                && request.getSpecialDesignationName() != null) {
            event.setSpecialDesignationUpdated(true);
        }
        if (event.getServiceId() == null && employee.getService() != null) {
            event.setServiceId(employee.getService().getId());
        }
    }

    private List<EmployeeAction> loadActiveActionsChronological(Long employeeId) {
        return employeeActionRepository
                .findByEmployeeIdOrderByActionDateDescCreatedAtDesc(employeeId)
                .stream()
                .filter(a -> !Boolean.TRUE.equals(a.getDeleted()))
                .sorted(Comparator.comparing(EmployeeAction::getActionDate)
                        .thenComparing(EmployeeAction::getId))
                .toList();
    }

    private List<CareerHistoryEventRequest> toCareerHistoryEvents(
            Employee employee,
            List<EmployeeAction> actions
    ) {
        return actions.stream().map(a -> {
            CareerHistoryEventRequest e = new CareerHistoryEventRequest();
            e.setActionType(a.getActionType());
            e.setActionDate(a.getActionDate());
            e.setDesignationId(a.getNewDesignation() != null ? a.getNewDesignation().getId() : null);
            e.setRecordedDesignationName(a.getRecordedNewDesignationName());
            e.setSpecialDesignationName(a.getRecordedSpecialDesignationName());
            e.setSpecialDesignationUpdated(a.getSpecialDesignationUpdated());
            e.setGrade(a.getNewGrade());
            e.setServiceId(a.getServiceId() != null ? a.getServiceId()
                    : a.getNewDesignation() != null && a.getNewDesignation().getService() != null
                    ? a.getNewDesignation().getService().getId()
                    : employee.getService() != null ? employee.getService().getId() : null);
            e.setServiceLevelId(a.getServiceLevelId() != null ? a.getServiceLevelId()
                    : a.getNewDesignation() != null && a.getNewDesignation().getServiceLevel() != null
                    ? a.getNewDesignation().getServiceLevel().getId()
                    : employee.getServiceLevel() != null ? employee.getServiceLevel().getId() : null);
            e.setDepartment(a.getDepartment());
            e.setOffice(a.getOffice());
            e.setDistrict(a.getDistrict());
            e.setToDepartment(a.getToDepartment());
            e.setToOffice(a.getToOffice());
            e.setToDistrict(a.getDistrict());
            e.setTransferringOut(a.getActionType() == EmployeeActionType.PROMOTION
                    && a.getToDepartment() != null
                    && a.getFromDepartment() != null
                    && !java.util.Objects.equals(a.getToDepartment(), a.getFromDepartment()));
            e.setReason(a.getReason());
            e.setRemarks(a.getRemarks());
            e.setServiceAppointmentKey(a.getServiceAppointmentKey());
            e.setAppointmentBasis(a.getAppointmentBasis());
            e.setIncrementDate(a.getIncrementDate());
            e.setFirstIncrementDueDate(a.getFirstIncrementDueDate());
            return e;
        }).toList();
    }

    private String clarifyTimelineValidationMessage(String message) {
        if (message == null || message.isBlank()) {
            return "This change would make a later lifecycle event invalid. "
                    + "Adjust the later event first, then try again.";
        }
        if (message.contains("cannot be earlier than")
                || message.contains("requires the service period")
                || message.contains("probation period")) {
            return message
                    + " Move that later event first, then retry this edit.";
        }
        return message;
    }

    private boolean isWorkplaceEstablishingAction(EmployeeAction action) {
        return switch (action.getActionType()) {
            case NEW_APPOINTMENT, OFFICE_CHANGE, TRANSFER_OUT -> true;
            case TRANSFER_IN -> action.getLinkedActionId() == null;
            default -> false;
        };
    }

    private boolean isFirstNwpJoinAction(EmployeeAction action) {
        if (!DepartmentConstants.isNwpEngineering(action.getDepartment())) {
            return false;
        }
        return switch (action.getActionType()) {
            case NEW_APPOINTMENT, TRANSFER_OUT -> true;
            case TRANSFER_IN -> action.getLinkedActionId() == null;
            default -> false;
        };
    }

    private void syncLinkedTransferIn(EmployeeAction transferOut) {
        employeeActionRepository.findById(transferOut.getLinkedActionId())
                .ifPresent(transferIn -> {
                    transferIn.setActionDate(transferOut.getActionDate());
                    transferIn.setRemarks(transferOut.getRemarks());
                    transferIn.setFromDepartment(transferOut.getFromDepartment());
                    transferIn.setFromOffice(transferOut.getFromOffice());
                    transferIn.setDepartment(transferOut.getDepartment());
                    transferIn.setOffice(transferOut.getOffice());
                    transferIn.setDistrict(transferOut.getDistrict());
                    transferIn.setTransferredFrom(transferOut.getFromDepartment());
                    transferIn.setNewDesignation(transferOut.getNewDesignation());
                    transferIn.setRecordedNewDesignationName(
                            transferOut.getRecordedNewDesignationName()
                    );
                    transferIn.setRecordedSpecialDesignationName(
                            transferOut.getRecordedSpecialDesignationName()
                    );
                    transferIn.setEditedBy(currentUserService.getCurrentUsernameOrDefault("system"));
                    transferIn.setEditedAt(java.time.LocalDateTime.now());
                    employeeActionRepository.save(transferIn);
                });
    }

    private Long resolveLatestModifiableActionId(List<EmployeeAction> actions) {
        for (EmployeeAction action : actions) {
            if (action.getActionType() != EmployeeActionType.TRANSFER_IN
                    || action.getLinkedActionId() == null) {
                return action.getId();
            }
        }
        return actions.isEmpty() ? null : actions.getFirst().getId();
    }

    private void applyWorkplaceDistrictUpdate(
            EmployeeAction action,
            EmployeeActionUpdateRequest request
    ) {
        boolean workplaceType = switch (action.getActionType()) {
            case SERVICE_APPOINTMENT, OFFICE_CHANGE, NEW_APPOINTMENT,
                    TRANSFER_OUT, TRANSFER_IN -> true;
            default -> false;
        };
        if (!workplaceType) {
            return;
        }

        boolean workplaceTouched = request.getDepartment() != null
                || request.getOffice() != null
                || request.getToDepartment() != null
                || request.getToOffice() != null
                || request.getDistrict() != null
                || request.getToDistrict() != null;
        if (!workplaceTouched && action.getActionType() != EmployeeActionType.SERVICE_APPOINTMENT) {
            return;
        }

        String district = request.getToDistrict() != null
                ? request.getToDistrict()
                : request.getDistrict();
        if (district != null && district.isBlank()) {
            district = null;
        }
        // Service appointment always applies district from the form (may clear for non-NWP).
        if (action.getActionType() == EmployeeActionType.SERVICE_APPOINTMENT
                || workplaceTouched) {
            action.setDistrict(district);
        }
    }

    private void applyReasonUpdate(
            EmployeeAction action,
            EmployeeActionUpdateRequest request
    ) {
        boolean reasonRequired = action.getActionType() == EmployeeActionType.DISMISSAL
                || action.getActionType() == EmployeeActionType.VACATION_OF_POST;
        if (reasonRequired) {
            if (request.getReason() == null || request.getReason().isBlank()) {
                throw new IllegalArgumentException("Reason is required for this lifecycle action");
            }
            action.setReason(request.getReason().trim());
            return;
        }
        // Do not clear an existing reason when the edit form omits the field.
        if (request.getReason() != null) {
            action.setReason(
                    request.getReason().isBlank() ? null : request.getReason().trim()
            );
        }
    }

    private void applyPromotionWorkplaceUpdate(
            EmployeeAction action,
            EmployeeActionUpdateRequest request
    ) {
        String sourceDepartment = action.getFromDepartment() != null ? action.getFromDepartment() : action.getDepartment();
        boolean transferringOut = Boolean.TRUE.equals(request.getTransferringOut());

        if (transferringOut) {
            if (request.getToDepartment() == null || request.getToDepartment().isBlank()) {
                throw new RuntimeException("Destination department is required");
            }
            if (request.getToOffice() == null || request.getToOffice().isBlank()) {
                throw new RuntimeException("Destination office is required");
            }

            String normalizedDestination = DepartmentConstants.normalize(
                    request.getToDepartment().trim()
            );
            if (java.util.Objects.equals(DepartmentConstants.normalize(sourceDepartment), normalizedDestination)) {
                throw new RuntimeException(
                        "Use \"Stays in department\" when the employee remains in "
                                + sourceDepartment
                );
            }

            officeService.validateNwpWorkplaceIfNwp(
                    normalizedDestination,
                    request.getToOffice(),
                    request.getToDistrict()
            );

            String fromDepartment = action.getFromDepartment() != null
                    ? action.getFromDepartment()
                    : action.getDepartment();
            String fromOffice = action.getFromOffice() != null
                    ? action.getFromOffice()
                    : action.getOffice();

            if (fromOffice == null || fromOffice.isBlank()) {
                throw new RuntimeException("Source office is not set on this promotion");
            }

            action.setFromDepartment(DepartmentConstants.normalize(fromDepartment));
            action.setFromOffice(fromOffice.trim());
            action.setDepartment(normalizedDestination);
            action.setOffice(request.getToOffice().trim());
            action.setToDepartment(normalizedDestination);
            action.setToOffice(request.getToOffice().trim());
            action.setDistrict(
                    DepartmentConstants.isNwpEngineering(normalizedDestination)
                            ? request.getToDistrict()
                            : null
            );
            return;
        }

        String stayingOffice = action.getFromOffice() != null
                ? action.getFromOffice()
                : action.getOffice();
        if (stayingOffice == null || stayingOffice.isBlank()) {
            Employee employee = action.getEmployee();
            if (employee.getCurrentOffice() != null && !employee.getCurrentOffice().isBlank()) {
                stayingOffice = employee.getCurrentOffice();
            }
        }
        if (stayingOffice == null || stayingOffice.isBlank()) {
            throw new RuntimeException("Office is required for a staying promotion");
        }

        action.setDepartment(sourceDepartment);
        action.setOffice(stayingOffice.trim());
        action.setFromDepartment(null);
        action.setFromOffice(null);
        action.setToDepartment(null);
        action.setToOffice(null);
        action.setDistrict(null);
    }

    private void applyWorkplaceFields(
            EmployeeAction action,
            ActionWorkplaceFields workplace
    ) {
        if (workplace == null) {
            return;
        }
        if (workplace.getDepartment() != null) {
            action.setDepartment(DepartmentConstants.normalize(workplace.getDepartment()));
        }
        if (workplace.getOffice() != null) {
            action.setOffice(workplace.getOffice().trim());
        }
        if (workplace.getFromDepartment() != null) {
            action.setFromDepartment(
                    DepartmentConstants.normalize(workplace.getFromDepartment())
            );
        }
        if (workplace.getFromOffice() != null) {
            action.setFromOffice(workplace.getFromOffice().trim());
        }
        if (workplace.getToDepartment() != null) {
            action.setToDepartment(
                    DepartmentConstants.normalize(workplace.getToDepartment())
            );
        }
        if (workplace.getToOffice() != null) {
            action.setToOffice(workplace.getToOffice().trim());
        }
        if (workplace.getDistrict() != null) {
            action.setDistrict(workplace.getDistrict());
        } else if (workplace.getToDistrict() != null) {
            action.setDistrict(workplace.getToDistrict());
        }
        if (workplace.getLinkedActionId() != null) {
            action.setLinkedActionId(workplace.getLinkedActionId());
        }

        if (action.getActionType() == EmployeeActionType.TRANSFER_OUT) {
            action.setTransferredFrom(action.getFromDepartment());
            action.setTransferredTo(action.getToDepartment());
        } else if (action.getActionType() == EmployeeActionType.TRANSFER_IN) {
            action.setTransferredFrom(action.getFromDepartment());
        }
    }

    private String resolveDistrictForDepartment(
            String department,
            String actionDistrict,
            String office,
            String fallback
    ) {
        if (!DepartmentConstants.isNwpEngineering(department)) {
            return null;
        }
        if (actionDistrict != null && !actionDistrict.isBlank()) {
            return actionDistrict;
        }
        return officeService.findDistrictByOfficeName(office).orElse(fallback);
    }

    private String formatWorkingPlace(String department, String office) {
        if (department == null && office == null) {
            return null;
        }
        if (department != null && office != null) {
            return department + " — " + office;
        }
        return department != null ? department : office;
    }

    private void applyGradeAchievementDates(
            EmployeeCareerProgression careerProgression,
            Grade oldGrade,
            Grade newGrade,
            LocalDate actionDate
    ) {
        if (oldGrade == Grade.III && newGrade == Grade.II) {
            careerProgression.setGrade2AchievedDate(actionDate);
        }
        if (oldGrade == Grade.II && newGrade == Grade.I) {
            careerProgression.setGrade1AchievedDate(actionDate);
        }
        if (SupraPromotionPolicy.isEntryGrade(oldGrade) && newGrade == Grade.SUPRA) {
            careerProgression.setSupraAchievedDate(actionDate);
        }
        if (oldGrade == Grade.I && newGrade == Grade.SPECIAL) {
            careerProgression.setSpecialAchievedDate(actionDate);
        }
    }

    private boolean isGradePromotion(Grade oldGrade, Grade newGrade) {
        return (oldGrade == Grade.III && newGrade == Grade.II)
                || (oldGrade == Grade.II && newGrade == Grade.I)
                || (SupraPromotionPolicy.isEntryGrade(oldGrade) && newGrade == Grade.SUPRA)
                || (oldGrade == Grade.I && newGrade == Grade.SPECIAL);
    }

    private EmployeeAction requireEditableAction(Long actionId) {
        EmployeeAction action = employeeActionRepository.findById(actionId)
                .orElseThrow(() -> new RuntimeException("Employee action not found"));

        if (action.getDeleted() != null && action.getDeleted()) {
            throw new RuntimeException("This lifecycle action has already been deleted");
        }

        if (action.getActionType() == EmployeeActionType.TRANSFER_IN
                && action.getLinkedActionId() != null) {
            throw new RuntimeException(
                    "Auto-created transfer in actions cannot be modified independently"
            );
        }

        return action;
    }

    private EmployeeAction requireLatestModifiableAction(Long actionId) {
        EmployeeAction action = requireEditableAction(actionId);

        List<EmployeeAction> actions = employeeActionRepository
                .findByEmployeeIdOrderByActionDateDescCreatedAtDesc(
                        action.getEmployee().getId()
                )
                .stream()
                .filter(item -> item.getDeleted() == null || !item.getDeleted())
                .toList();

        Long latestModifiableId = resolveLatestModifiableActionId(actions);
        if (latestModifiableId == null
                || !latestModifiableId.equals(action.getId())) {
            throw new RuntimeException(
                    "Only the most recent lifecycle action can be deleted"
            );
        }

        return action;
    }

    private EmployeeActionResponse toResponse(
            EmployeeAction action,
            boolean canEdit,
            boolean canDelete
    ) {
        boolean autoCreated = action.getActionType() == EmployeeActionType.TRANSFER_IN
                && action.getLinkedActionId() != null;

        return EmployeeActionResponse.builder()
                .id(action.getId())
                .actionType(action.getActionType())
                .actionDate(action.getActionDate())
                .oldDesignationName(
                        action.getOldDesignation() != null
                                ? action.getOldDesignation().getDesignationName()
                                : null
                )
                .oldDesignationId(
                        action.getOldDesignation() != null
                                ? action.getOldDesignation().getId()
                                : null
                )
                .newDesignationName(resolveActionDisplayDesignationName(action))
                .recordedDesignationName(action.getRecordedNewDesignationName())
                .specialDesignationName(action.getRecordedSpecialDesignationName())
                .specialDesignationUpdated(action.getSpecialDesignationUpdated())
                .newDesignationId(
                        action.getNewDesignation() != null
                                ? action.getNewDesignation().getId()
                                : null
                )
                .oldGrade(action.getOldGrade() != null ? action.getOldGrade().getLabel() : null)
                .newGrade(action.getNewGrade() != null ? action.getNewGrade().getLabel() : null)
                .transferredFrom(action.getTransferredFrom() != null
                        ? action.getTransferredFrom()
                        : action.getFromDepartment())
                .transferredTo(action.getTransferredTo() != null
                        ? action.getTransferredTo()
                        : action.getToDepartment())
                .department(action.getDepartment())
                .office(action.getOffice())
                .fromDepartment(action.getFromDepartment())
                .fromOffice(action.getFromOffice())
                .toDepartment(action.getToDepartment())
                .toOffice(action.getToOffice())
                .district(action.getDistrict())
                .linkedActionId(action.getLinkedActionId())
                .reason(action.getReason())
                .remarks(action.getRemarks())
                .serviceAppointmentKey(action.getServiceAppointmentKey())
                .serviceId(action.getNewDesignation() != null && action.getNewDesignation().getService() != null
                        ? action.getNewDesignation().getService().getId() : action.getServiceId())
                .serviceLevelId(action.getServiceLevelId() != null ? action.getServiceLevelId()
                        : action.getNewDesignation() != null && action.getNewDesignation().getServiceLevel() != null
                        ? action.getNewDesignation().getServiceLevel().getId() : null)
                .oldServiceCode(action.getOldDesignation() != null && action.getOldDesignation().getService() != null
                        ? action.getOldDesignation().getService().getServiceCode() : null)
                .newServiceCode(action.getNewDesignation() != null && action.getNewDesignation().getService() != null
                        ? action.getNewDesignation().getService().getServiceCode() : null)
                .appointmentBasis(action.getAppointmentBasis())
                .incrementDate(action.getIncrementDate()).firstIncrementDueDate(action.getFirstIncrementDueDate())
                .createdAt(action.getCreatedAt())
                .canModify(canEdit && !autoCreated)
                .canEdit(canEdit && !autoCreated)
                .canDelete(canDelete && !autoCreated)
                .autoCreated(autoCreated)
                .trainingGraduation(action.getTrainingGraduation())
                .trainingAppointment(action.getTrainingAppointment())
                .build();
    }

    public void validateSequentialActionDate(Long employeeId, LocalDate actionDate) {
        if (employeeId == null || actionDate == null) {
            return;
        }

        EmployeeAction latestAction = findLatestAction(employeeId);
        if (latestAction != null
                && actionDate.isBefore(latestAction.getActionDate())) {
            throw new RuntimeException(
                    "Action date cannot be earlier than the previous event ("
                            + latestAction.getActionDate()
                            + ")."
            );
        }
    }

    public void validateSequentialActionDateOnUpdate(
            EmployeeAction action,
            LocalDate newDate
    ) {
        if (action == null || newDate == null || action.getEmployee() == null) {
            return;
        }

        LocalDate previousDate = findPreviousActionDate(
                action.getEmployee().getId(),
                action.getId()
        );
        if (previousDate != null && newDate.isBefore(previousDate)) {
            throw new RuntimeException(
                    "Action date cannot be earlier than the previous event ("
                            + previousDate
                            + ")."
            );
        }

        LocalDate nextDate = findNextActionDate(
                action.getEmployee().getId(),
                action.getId()
        );
        if (nextDate != null && newDate.isAfter(nextDate)) {
            throw new RuntimeException(
                    "Action date cannot be later than the next event ("
                            + nextDate
                            + "). Move that later event first, then retry this edit."
            );
        }

        if (newDate.isAfter(LocalDate.now())) {
            throw new RuntimeException("Action date cannot be in the future.");
        }
    }

    private EmployeeAction findLatestAction(Long employeeId) {
        return employeeActionRepository
                .findByEmployeeIdOrderByActionDateDescCreatedAtDesc(employeeId)
                .stream()
                .filter(action -> action.getDeleted() == null || !action.getDeleted())
                .findFirst()
                .orElse(null);
    }

    private LocalDate findPreviousActionDate(Long employeeId, Long actionId) {
        List<EmployeeAction> actions = loadActiveActionsChronological(employeeId);

        for (int index = 0; index < actions.size(); index++) {
            if (actions.get(index).getId().equals(actionId) && index > 0) {
                return actions.get(index - 1).getActionDate();
            }
        }

        return null;
    }

    private LocalDate findNextActionDate(Long employeeId, Long actionId) {
        List<EmployeeAction> actions = loadActiveActionsChronological(employeeId);

        for (int index = 0; index < actions.size(); index++) {
            EmployeeAction current = actions.get(index);
            if (!current.getId().equals(actionId)) {
                continue;
            }
            // Linked auto transfer-in moves with transfer-out on save — skip it as a bound.
            for (int next = index + 1; next < actions.size(); next++) {
                EmployeeAction candidate = actions.get(next);
                if (current.getActionType() == EmployeeActionType.TRANSFER_OUT
                        && current.getLinkedActionId() != null
                        && current.getLinkedActionId().equals(candidate.getId())) {
                    continue;
                }
                return candidate.getActionDate();
            }
            return null;
        }

        return null;
    }

    private String normalizeSpecialDesignationName(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private String resolveActionDisplayDesignationName(EmployeeAction action) {
        String specialName = normalizeSpecialDesignationName(
                action.getRecordedSpecialDesignationName()
        );
        if (specialName != null) {
            return specialName;
        }
        if (action.getRecordedNewDesignationName() != null
                && !action.getRecordedNewDesignationName().isBlank()) {
            return action.getRecordedNewDesignationName();
        }
        if (action.getNewDesignation() != null) {
            return action.getNewDesignation().getDesignationName();
        }
        return null;
    }
}
