package com.nwpengdep.hrms.service.report;

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
        Long designationId = null;

        for (EmployeeAction action : relevant) {
            switch (action.getActionType()) {
                case NEW_APPOINTMENT, TRANSFER_IN, PROMOTION -> {
                    active = true;
                    if (action.getNewDesignation() != null) {
                        designationId = action.getNewDesignation().getId();
                    }
                }
                case TRANSFER_OUT,
                        RETIREMENT_OR_RESIGNATION,
                        DEATH,
                        DISMISSAL -> active = false;
                default -> {
                }
            }
        }

        if (!relevant.isEmpty()) {
            return new EmployeeSnapshot(
                    active,
                    designationId,
                    employee.getEmploymentType()
            );
        }

        if (isDeactivatedOnOrBefore(employeeActions, asOfDate)) {
            return EmployeeSnapshot.inactive();
        }

        if (employee.getDesignation() != null) {
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
                        action.getActionType() == EmployeeActionType.TRANSFER_OUT
                                || action.getActionType()
                                == EmployeeActionType.RETIREMENT_OR_RESIGNATION
                                || action.getActionType() == EmployeeActionType.DEATH
                                || action.getActionType() == EmployeeActionType.DISMISSAL
                );
    }

    private LocalDate resolveJoinDate(Employee employee) {
        // Cadre reports must be based on the date the employee actually joined
        // the NWP Engineering Department (Reported to Present Working Place).
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
