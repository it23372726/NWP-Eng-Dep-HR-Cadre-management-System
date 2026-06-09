package com.nwpengdep.hrms.service;

import com.nwpengdep.hrms.dto.EmployeeActionResponse;
import com.nwpengdep.hrms.dto.EmployeeActionUpdateRequest;
import com.nwpengdep.hrms.entity.*;
import com.nwpengdep.hrms.repository.DesignationRepository;
import com.nwpengdep.hrms.repository.EmployeeActionRepository;
import com.nwpengdep.hrms.repository.EmployeePostingRepository;
import com.nwpengdep.hrms.repository.EmployeeRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class EmployeeActionService {

    private final EmployeeActionRepository employeeActionRepository;
    private final EmployeeRepository employeeRepository;
    private final DesignationRepository designationRepository;
    private final EmployeePostingRepository postingRepository;
    private final ServiceLevelService serviceLevelService;
    private final QualificationEvaluatorService qualificationEvaluatorService;

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
        EmployeeAction action = EmployeeAction.builder()
                .employee(employee)
                .actionType(actionType)
                .actionDate(actionDate)
                .oldDesignation(oldDesignation)
                .newDesignation(newDesignation)
                .transferredFrom(transferredFrom)
                .transferredTo(transferredTo)
                .reason(reason)
                .remarks(remarks)
                .build();

        return employeeActionRepository.save(action);
    }

    public List<EmployeeActionResponse> getEmployeeActionHistory(Long employeeId) {
        return employeeActionRepository
                .findByEmployeeIdOrderByActionDateDescCreatedAtDesc(employeeId)
                .stream()
                .filter(action -> action.getDeleted() == null || !action.getDeleted())
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public EmployeeAction updateEmployeeAction(
            Long actionId,
            EmployeeActionUpdateRequest request
    ) {
        EmployeeAction action = employeeActionRepository.findById(actionId)
                .orElseThrow(() -> new RuntimeException("Employee action not found"));

        if (action.getDeleted() != null && action.getDeleted()) {
            throw new RuntimeException("Cannot update a deleted action");
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
        if (action.getActionType() == EmployeeActionType.PROMOTION) {
            Employee employee = action.getEmployee();
            if (request.getGrade() != null) {
                employee.setGrade(Grade.fromLabel(request.getGrade()));
            }
            if (request.getServiceLevelId() != null) {
                ServiceLevel serviceLevel = serviceLevelService.resolve(request.getServiceLevelId());
                employee.setServiceLevel(serviceLevel);
            }
            employeeRepository.save(employee);
        }

        recalculateEmployeeState(action.getEmployee().getId());

        return action;
    }

    @Transactional
    public void deleteEmployeeAction(Long actionId) {
        EmployeeAction action = employeeActionRepository.findById(actionId)
                .orElseThrow(() -> new RuntimeException("Employee action not found"));

        if (action.getDeleted() != null && action.getDeleted()) {
            throw new RuntimeException("Action already deleted");
        }

        action.setDeleted(true);
        action.setDeletedBy("system"); // TODO: Get from authenticated user
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
        EmployeeStatus currentStatus = EmployeeStatus.ACTIVE;
        String currentWorkingPlace = null;
        ServiceLevel currentServiceLevel = employee.getServiceLevel();
        Grade currentGrade = employee.getGrade();

        for (EmployeeAction action : actions) {
            switch (action.getActionType()) {
                case NEW_APPOINTMENT:
                    currentDesignation = action.getNewDesignation();
                    currentStatus = EmployeeStatus.ACTIVE;
                    break;

                case TRANSFER_IN:
                    currentDesignation = action.getNewDesignation();
                    currentStatus = EmployeeStatus.ACTIVE;
                    if (action.getTransferredFrom() != null) {
                        currentWorkingPlace = action.getTransferredFrom();
                    }
                    break;

                case TRANSFER_OUT:
                    currentStatus = EmployeeStatus.INACTIVE;
                    break;

                case PROMOTION:
                    currentDesignation = action.getNewDesignation();
                    // Note: Grade and service level are stored on employee entity
                    // They are updated directly during promotion edit, not replayed from history
                    // This is because they are employee attributes, not action attributes
                    break;

                case PERMANENT_CONFIRMATION:
                    employee.setPermanentConfirmationDate(action.getActionDate());
                    break;

                case RETIREMENT_OR_RESIGNATION:
                case DEATH:
                case DISMISSAL:
                    currentStatus = EmployeeStatus.INACTIVE;
                    break;
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
        employee.setStatus(currentStatus);
        employee.setTransferredFrom(currentWorkingPlace);
        if (actions.stream().noneMatch(
                action -> action.getActionType() == EmployeeActionType.PERMANENT_CONFIRMATION
        )) {
            employee.setPermanentConfirmationDate(null);
        }
        qualificationEvaluatorService.evaluatePermanentQualification(employee);
        // Grade and service level are preserved from employee entity
        // They are only updated during promotion edit, not replayed from history
        employeeRepository.save(employee);
    }

    private EmployeeActionResponse toResponse(EmployeeAction action) {
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
                .transferredFrom(action.getTransferredFrom())
                .transferredTo(action.getTransferredTo())
                .reason(action.getReason())
                .remarks(action.getRemarks())
                .createdAt(action.getCreatedAt())
                .build();
    }
}
