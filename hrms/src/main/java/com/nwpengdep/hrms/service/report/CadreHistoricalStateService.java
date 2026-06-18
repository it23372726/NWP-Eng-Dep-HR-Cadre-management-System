package com.nwpengdep.hrms.service.report;

import com.nwpengdep.hrms.constants.DepartmentConstants;
import com.nwpengdep.hrms.entity.*;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;

@Component
public class CadreHistoricalStateService {

    public boolean employeeExistedOnDate(Employee employee, LocalDate asOfDate) {
        LocalDate joinDate = resolveJoinDate(employee);
        return joinDate != null && !joinDate.isAfter(asOfDate);
    }

    public EmployeeSnapshot snapshotAt(
            Employee employee,
            LocalDate asOfDate,
            List<EmployeeAction> employeeActions
    ) {
        if (!employeeExistedOnDate(employee, asOfDate)) {
            return EmployeeSnapshot.inactive();
        }

        List<EmployeeAction> relevant = employeeActions.stream()
                .filter(action -> (action.getDeleted() == null || !action.getDeleted()))
                .filter(action -> !action.getActionDate().isAfter(asOfDate))
                .sorted(Comparator
                        .comparing(EmployeeAction::getActionDate)
                        .thenComparing(EmployeeAction::getId))
                .toList();

        boolean active = false;
        boolean inNwpDepartment = false;
        Long designationId = null;

        for (EmployeeAction action : relevant) {
            switch (action.getActionType()) {
                case NEW_APPOINTMENT, TRANSFER_IN, PROMOTION -> {
                    active = true;
                    inNwpDepartment = DepartmentConstants.isNwpEngineering(
                            action.getDepartment()
                    );
                    if (action.getNewDesignation() != null) {
                        designationId = action.getNewDesignation().getId();
                    }
                }
                case TRANSFER_OUT, OFFICE_CHANGE -> {
                    active = true;
                    inNwpDepartment = DepartmentConstants.isNwpEngineering(
                            action.getDepartment()
                    );
                }
                case RETIREMENT_OR_RESIGNATION,
                        DEATH,
                        DISMISSAL -> active = false;
                default -> {
                }
            }
        }

        if (!relevant.isEmpty()) {
            if (!active || !inNwpDepartment) {
                return EmployeeSnapshot.inactive();
            }
            return new EmployeeSnapshot(
                    true,
                    designationId,
                    employee.getEmploymentType()
            );
        }

        if (isDeactivatedOnOrBefore(employeeActions, asOfDate)) {
            return EmployeeSnapshot.inactive();
        }

        if (employee.getDesignation() != null
                && DepartmentConstants.isNwpEngineering(employee.getCurrentDepartment())) {
            return new EmployeeSnapshot(
                    true,
                    employee.getDesignation().getId(),
                    employee.getEmploymentType()
            );
        }

        return EmployeeSnapshot.inactive();
    }

    private boolean isDeactivatedOnOrBefore(
            List<EmployeeAction> actions,
            LocalDate asOfDate
    ) {
        return actions.stream()
                .filter(action -> (action.getDeleted() == null || !action.getDeleted()))
                .filter(action -> !action.getActionDate().isAfter(asOfDate))
                .anyMatch(action ->
                        action.getActionType() == EmployeeActionType.RETIREMENT_OR_RESIGNATION
                                || action.getActionType() == EmployeeActionType.DEATH
                                || action.getActionType() == EmployeeActionType.DISMISSAL
                );
    }

    private LocalDate resolveJoinDate(Employee employee) {
        if (employee.getReportedDateToPresentWorkingPlace() != null) {
            return employee.getReportedDateToPresentWorkingPlace();
        }
        if (employee.getCreatedAt() != null) {
            return employee.getCreatedAt().toLocalDate();
        }
        return null;
    }

    public record EmployeeSnapshot(
            boolean active,
            Long designationId,
            EmploymentType employmentType
    ) {
        public static EmployeeSnapshot inactive() {
            return new EmployeeSnapshot(false, null, null);
        }
    }
}
