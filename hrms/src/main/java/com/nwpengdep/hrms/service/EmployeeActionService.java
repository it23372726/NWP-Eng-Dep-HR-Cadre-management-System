package com.nwpengdep.hrms.service;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;

import org.springframework.stereotype.Service;

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

    public EmployeeAction recordAction(
            Employee employee,
            EmployeeActionType actionType,
            java.time.LocalDate actionDate,
            Designation oldDesignation,
            Designation newDesignation,
            String transferredFrom,
            String transferredTo,
            String reason,
            String remarks
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
                remarks
        );
    }

    public EmployeeAction recordActionWithGrades(
            Employee employee,
            EmployeeActionType actionType,
            java.time.LocalDate actionDate,
            Designation oldDesignation,
            Designation newDesignation,
            Grade oldGrade,
            Grade newGrade,
            String transferredFrom,
            String transferredTo,
            String reason,
            String remarks
    ) {
        EmployeeAction action = EmployeeAction.builder()
                .employee(employee)
                .actionType(actionType)
                .actionDate(actionDate)
                .oldDesignation(oldDesignation)
                .newDesignation(newDesignation)
                .oldGrade(oldGrade)
                .newGrade(newGrade)
                .transferredFrom(transferredFrom)
                .transferredTo(transferredTo)
                .reason(reason)
                .remarks(remarks)
                .build();

        return employeeActionRepository.save(action);
    }

    public List<EmployeeActionResponse> getEmployeeActionHistory(Long employeeId) {
        List<EmployeeAction> actions = employeeActionRepository
                .findByEmployeeIdOrderByActionDateDescCreatedAtDesc(employeeId)
                .stream()
                .filter(action -> action.getDeleted() == null || !action.getDeleted())
                .toList();

        Long latestActionId = actions.isEmpty() ? null : actions.getFirst().getId();

        return actions.stream()
                .map(action -> toResponse(
                        action,
                        latestActionId != null && latestActionId.equals(action.getId())
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

        action.setActionDate(request.getActionDate());
        action.setRemarks(request.getRemarks());

        // oldDesignationId is immutable - never update it
        // This preserves historical integrity

        if (request.getNewDesignationId() != null) {
            Designation newDesignation = designationRepository.findById(request.getNewDesignationId())
                    .orElseThrow(() -> new RuntimeException("New designation not found"));
            action.setNewDesignation(newDesignation);
        }

        action.setTransferredFrom(request.getTransferredFrom());
        action.setTransferredTo(request.getTransferredTo());
        action.setReason(request.getReason());
        action.setEditedBy("system"); // TODO: Get from authenticated user
        action.setEditedAt(java.time.LocalDateTime.now());

        employeeActionRepository.save(action);

        // For promotion actions, also update employee grade and service level
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

        action.setDeleted(true);
        action.setDeletedBy("system"); // TODO: Get from authenticated user
        action.setDeletedAt(java.time.LocalDateTime.now());

        employeeActionRepository.save(action);

        if (action.getOldGrade() != null) {
            Employee employee = action.getEmployee();
            employee.setGrade(action.getOldGrade());
            careerProgressionService.recalculateEmployeeCareer(employee);
            employeeRepository.save(employee);
        }

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
        EmployeeStatus currentStatus = EmployeeStatus.ACTIVE;
        String currentWorkingPlace = null;
        Grade currentGrade = employee.getGrade();
        EmployeeCareerProgression careerProgression =
                careerProgressionService.ensureCareerProgression(employee);
        careerProgression.setPermanentConfirmationDate(null);
        careerProgression.setGrade3AchievedDate(null);
        careerProgression.setGrade2AchievedDate(null);
        careerProgression.setGrade1AchievedDate(null);
        LocalDate latestAppointmentDate = null;

        for (EmployeeAction action : actions) {
            switch (action.getActionType()) {
                case NEW_APPOINTMENT -> {
                    currentDesignation = action.getNewDesignation();
                    currentStatus = EmployeeStatus.ACTIVE;
                }

                case TRANSFER_IN -> {
                    currentDesignation = action.getNewDesignation();
                    currentStatus = EmployeeStatus.ACTIVE;
                    if (action.getTransferredFrom() != null) {
                        currentWorkingPlace = action.getTransferredFrom();
                    }
                }

                case TRANSFER_OUT -> {
                    currentStatus = EmployeeStatus.INACTIVE;
                }

                case PROMOTION -> {
                    currentDesignation = action.getNewDesignation();
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
                    careerProgression.setPermanentConfirmationDate(action.getActionDate());
                    careerProgression.setGrade3AchievedDate(action.getActionDate());
                    latestAppointmentDate = action.getActionDate();
                }

                case RETIREMENT_OR_RESIGNATION, DEATH, DISMISSAL -> {
                    currentStatus = EmployeeStatus.INACTIVE;
                }
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

        employee.setDesignation(currentDesignation);
        employee.setGrade(currentGrade);
        employee.setStatus(currentStatus);
        employee.setTransferredFrom(currentWorkingPlace);
        if (latestAppointmentDate != null) {
            employee.setAppointmentDateToPresentClassGrade(latestAppointmentDate);
        }
        careerProgressionService.recalculateEmployeeCareer(employee);
        employeeRepository.save(employee);
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
    }

    private boolean isGradePromotion(Grade oldGrade, Grade newGrade) {
        return (oldGrade == Grade.III && newGrade == Grade.II)
                || (oldGrade == Grade.II && newGrade == Grade.I);
    }

    private EmployeeAction requireLatestModifiableAction(Long actionId) {
        EmployeeAction action = employeeActionRepository.findById(actionId)
                .orElseThrow(() -> new RuntimeException("Employee action not found"));

        if (action.getDeleted() != null && action.getDeleted()) {
            throw new RuntimeException("This lifecycle action has already been deleted");
        }

        List<EmployeeAction> actions = employeeActionRepository
                .findByEmployeeIdOrderByActionDateDescCreatedAtDesc(
                        action.getEmployee().getId()
                )
                .stream()
                .filter(item -> item.getDeleted() == null || !item.getDeleted())
                .toList();

        if (actions.isEmpty()
                || !actions.getFirst().getId().equals(action.getId())) {
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
                        action.getNewDesignation() != null
                                ? action.getNewDesignation().getDesignationName()
                                : null
                )
                .newDesignationId(
                        action.getNewDesignation() != null
                                ? action.getNewDesignation().getId()
                                : null
                )
                .oldGrade(action.getOldGrade() != null ? action.getOldGrade().getLabel() : null)
                .newGrade(action.getNewGrade() != null ? action.getNewGrade().getLabel() : null)
                .transferredFrom(action.getTransferredFrom())
                .transferredTo(action.getTransferredTo())
                .reason(action.getReason())
                .remarks(action.getRemarks())
                .createdAt(action.getCreatedAt())
                .canModify(canModify)
                .build();
    }
}
