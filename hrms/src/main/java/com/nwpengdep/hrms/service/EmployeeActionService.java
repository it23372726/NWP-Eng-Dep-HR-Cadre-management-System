package com.nwpengdep.hrms.service;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;

import org.springframework.stereotype.Service;

import com.nwpengdep.hrms.constants.DepartmentConstants;
import com.nwpengdep.hrms.dto.ActionWorkplaceFields;
import com.nwpengdep.hrms.dto.EmployeeActionResponse;
import com.nwpengdep.hrms.dto.EmployeeActionUpdateRequest;
import com.nwpengdep.hrms.entity.Designation;
import com.nwpengdep.hrms.entity.District;
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
        validateSequentialActionDate(employee.getId(), actionDate);

        EmployeeAction action = EmployeeAction.builder()
                .employee(employee)
                .actionType(actionType)
                .actionDate(actionDate)
                .oldDesignation(oldDesignation)
                .newDesignation(newDesignation)
                .recordedNewDesignationName(recordedNewDesignationName)
                .oldGrade(oldGrade)
                .newGrade(newGrade)
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
            ServiceLevel newServiceLevel,
            String fromDepartment,
            String fromOffice,
            String toDepartment,
            String toOffice,
            District toDistrict,
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

        District actionDistrict = DepartmentConstants.isNwpEngineering(normalizedToDept)
                ? toDistrict
                : null;

        EmployeeAction transferOut = recordActionWithGrades(
                employee,
                EmployeeActionType.TRANSFER_OUT,
                transferDate,
                oldDesignation,
                newDesignation,
                recordedNewDesignationName,
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

    public List<EmployeeActionResponse> getEmployeeActionHistory(Long employeeId) {
        List<EmployeeAction> actions = employeeActionRepository
                .findByEmployeeIdOrderByActionDateDescCreatedAtDesc(employeeId)
                .stream()
                .filter(action -> action.getDeleted() == null || !action.getDeleted())
                .toList();

        Long latestModifiableId = resolveLatestModifiableActionId(actions);

        return actions.stream()
                .map(action -> toResponse(
                        action,
                        latestModifiableId != null
                                && latestModifiableId.equals(action.getId())
                ))
                .toList();
    }

    @Transactional
    public EmployeeAction updateEmployeeAction(
            Long actionId,
            EmployeeActionUpdateRequest request
    ) {
        EmployeeAction action = requireLatestModifiableAction(actionId);
        Employee employee = action.getEmployee();
        Grade oldGrade = action.getOldGrade();
        Grade newGrade = action.getNewGrade();

        if (request.getGrade() != null) {
            newGrade = Grade.fromLabel(request.getGrade());
        }

        if (action.getActionType() == EmployeeActionType.PROMOTION
                || action.getActionType() == EmployeeActionType.ASSIGNMENT_GRADE_UPDATE) {
            careerProgressionService.validateAssignmentEffectiveDate(
                    employee,
                    oldGrade,
                    newGrade,
                    request.getActionDate()
            );
        }

        validateSequentialActionDateOnUpdate(action, request.getActionDate());

        action.setActionDate(request.getActionDate());
        action.setRemarks(request.getRemarks());

        if (request.getNewDesignationId() != null) {
            Designation newDesignation = designationRepository.findById(request.getNewDesignationId())
                    .orElseThrow(() -> new RuntimeException("New designation not found"));
            action.setNewDesignation(newDesignation);
            action.setRecordedNewDesignationName(null);
        } else if (request.getRecordedDesignationName() != null) {
            if (request.getRecordedDesignationName().isBlank()) {
                action.setRecordedNewDesignationName(null);
            } else {
                action.setNewDesignation(null);
                action.setRecordedNewDesignationName(
                        request.getRecordedDesignationName().trim()
                );
            }
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

        if (action.getActionType() == EmployeeActionType.PROMOTION
                && request.getTransferringOut() != null) {
            applyPromotionWorkplaceUpdate(action, request);
        }

        action.setReason(request.getReason());
        action.setEditedBy(currentUserService.getCurrentUsernameOrDefault("system"));
        action.setEditedAt(java.time.LocalDateTime.now());

        employeeActionRepository.save(action);

        if (action.getActionType() == EmployeeActionType.TRANSFER_OUT
                && action.getLinkedActionId() != null) {
            syncLinkedTransferIn(action);
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
            employeeActionRepository.save(action);
            employeeRepository.save(employee);
        }

        recalculateEmployeeState(action.getEmployee().getId());
        return action;
    }

    @Transactional
    public void deleteEmployeeAction(Long actionId) {
        EmployeeAction action = requireLatestModifiableAction(actionId);

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

        if (Boolean.TRUE.equals(action.getTrainingGraduation())) {
            trainingGraduationService.revertTrainingGraduation(
                    action.getEmployee().getId()
            );
            return;
        }

        action.setDeleted(true);
        action.setDeletedBy(currentUserService.getCurrentUsernameOrDefault("system"));
        action.setDeletedAt(java.time.LocalDateTime.now());
        employeeActionRepository.save(action);

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

        postingRepository.deleteByEmployeeId(employeeId);

        Designation currentDesignation = null;
        String currentRecordedDesignationName = null;
        EmployeeStatus currentStatus = EmployeeStatus.ACTIVE;
        String currentDepartment = null;
        String currentOffice = null;
        District currentDistrict = employee.getCurrentDistrictOfWorking();
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
                case NEW_APPOINTMENT -> {
                    if (action.getNewDesignation() != null) {
                        currentDesignation = action.getNewDesignation();
                        currentRecordedDesignationName = null;
                    } else if (action.getRecordedNewDesignationName() != null
                            && !action.getRecordedNewDesignationName().isBlank()) {
                        currentDesignation = null;
                        currentRecordedDesignationName =
                                action.getRecordedNewDesignationName().trim();
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
                    } else if (action.getRecordedNewDesignationName() != null
                            && !action.getRecordedNewDesignationName().isBlank()) {
                        currentDesignation = null;
                        currentRecordedDesignationName =
                                action.getRecordedNewDesignationName().trim();
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
                }

                case PROMOTION -> {
                    if (action.getNewDesignation() != null) {
                        currentDesignation = action.getNewDesignation();
                        currentRecordedDesignationName = null;
                    } else if (action.getRecordedNewDesignationName() != null
                            && !action.getRecordedNewDesignationName().isBlank()) {
                        currentDesignation = null;
                        currentRecordedDesignationName =
                                action.getRecordedNewDesignationName().trim();
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
                    } else if (action.getRecordedNewDesignationName() != null
                            && !action.getRecordedNewDesignationName().isBlank()) {
                        currentDesignation = null;
                        currentRecordedDesignationName =
                                action.getRecordedNewDesignationName().trim();
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
            if (currentDesignation.getService() != null) {
                employee.setService(currentDesignation.getService());
            }
        } else if (currentRecordedDesignationName != null) {
            employee.setRecordedDesignationName(currentRecordedDesignationName);
        } else {
            employee.setRecordedDesignationName(null);
        }
        if (currentGrade != null) {
            employee.setGrade(currentGrade);
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
        employeeRepository.save(employee);
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

    private void applyPromotionWorkplaceUpdate(
            EmployeeAction action,
            EmployeeActionUpdateRequest request
    ) {
        String nwpDepartment = DepartmentConstants.NWP_ENGINEERING;
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
            if (DepartmentConstants.isNwpEngineering(normalizedDestination)) {
                throw new RuntimeException(
                        "Use \"Stays in department\" when the employee remains in "
                                + nwpDepartment
                );
            }

            officeService.validateNwpWorkplaceIfNwp(
                    normalizedDestination,
                    request.getToOffice(),
                    request.getToDistrict()
            );

            String fromDepartment = action.getFromDepartment() != null
                    ? action.getFromDepartment()
                    : (DepartmentConstants.isNwpEngineering(action.getDepartment())
                            ? action.getDepartment()
                            : nwpDepartment);
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

        action.setDepartment(nwpDepartment);
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

    private District resolveDistrictForDepartment(
            String department,
            District actionDistrict,
            String office,
            District fallback
    ) {
        if (!DepartmentConstants.isNwpEngineering(department)) {
            return null;
        }
        if (actionDistrict != null) {
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
        if (oldGrade == Grade.I && newGrade == Grade.SUPRA) {
            careerProgression.setSupraAchievedDate(actionDate);
        }
        if (oldGrade == Grade.I && newGrade == Grade.SPECIAL) {
            careerProgression.setSpecialAchievedDate(actionDate);
        }
    }

    private boolean isGradePromotion(Grade oldGrade, Grade newGrade) {
        return (oldGrade == Grade.III && newGrade == Grade.II)
                || (oldGrade == Grade.II && newGrade == Grade.I)
                || (oldGrade == Grade.I && newGrade == Grade.SUPRA)
                || (oldGrade == Grade.I && newGrade == Grade.SPECIAL);
    }

    private EmployeeAction requireLatestModifiableAction(Long actionId) {
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
                    "Only the most recent lifecycle action can be modified or deleted"
            );
        }

        return action;
    }

    private EmployeeActionResponse toResponse(
            EmployeeAction action,
            boolean canModify
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
                .newDesignationName(
                        action.getRecordedNewDesignationName() != null
                                && !action.getRecordedNewDesignationName().isBlank()
                                ? action.getRecordedNewDesignationName()
                                : action.getNewDesignation() != null
                                        ? action.getNewDesignation().getDesignationName()
                                        : null
                )
                .recordedDesignationName(action.getRecordedNewDesignationName())
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
                .createdAt(action.getCreatedAt())
                .canModify(canModify && !autoCreated)
                .autoCreated(autoCreated)
                .trainingGraduation(action.getTrainingGraduation())
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
        List<EmployeeAction> actions = employeeActionRepository
                .findByEmployeeIdOrderByActionDateDescCreatedAtDesc(employeeId)
                .stream()
                .filter(action -> action.getDeleted() == null || !action.getDeleted())
                .sorted(Comparator
                        .comparing(EmployeeAction::getActionDate)
                        .thenComparing(EmployeeAction::getId))
                .toList();

        for (int index = 0; index < actions.size(); index++) {
            if (actions.get(index).getId().equals(actionId) && index > 0) {
                return actions.get(index - 1).getActionDate();
            }
        }

        return null;
    }
}
