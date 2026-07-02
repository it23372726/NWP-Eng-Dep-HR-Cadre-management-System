package com.nwpengdep.hrms.service.report;

import com.nwpengdep.hrms.dto.WorkplaceHistoryRowDto;
import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.entity.EmployeeAction;
import com.nwpengdep.hrms.entity.EmployeeActionType;
import com.nwpengdep.hrms.entity.EmployeeStatus;
import com.nwpengdep.hrms.repository.EmployeeActionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class EmployeeWorkplaceHistoryService {

    private static final Set<EmployeeActionType> WORKPLACE_CHANGING_TYPES = EnumSet.of(
            EmployeeActionType.NEW_APPOINTMENT,
            EmployeeActionType.OFFICE_CHANGE,
            EmployeeActionType.TRANSFER_OUT
    );

    private static final Set<EmployeeActionType> TERMINAL_TYPES = EnumSet.of(
            EmployeeActionType.RETIREMENT_OR_RESIGNATION,
            EmployeeActionType.DEATH,
            EmployeeActionType.DISMISSAL,
            EmployeeActionType.VACATION_OF_POST
    );

    private final EmployeeActionRepository employeeActionRepository;

    @Transactional(readOnly = true)
    public List<WorkplaceHistoryRowDto> buildHistory(Employee employee) {
        List<EmployeeAction> actions = employeeActionRepository
                .findActiveActionsByEmployeeIdOrderByActionDateAsc(employee.getId());

        List<WorkplaceEvent> workplaceEvents = new ArrayList<>();
        for (EmployeeAction action : actions) {
            if (!isWorkplaceChangingEvent(action)) {
                continue;
            }
            String workingPlace = resolveWorkingPlaceAfterEvent(action);
            if (workingPlace == null || workingPlace.isBlank()) {
                continue;
            }
            workplaceEvents.add(new WorkplaceEvent(action.getActionDate(), workingPlace));
        }

        if (workplaceEvents.isEmpty()) {
            return buildFallbackHistory(employee);
        }

        LocalDate terminalDate = findTerminalDate(actions);
        boolean active = employee.getStatus() == EmployeeStatus.ACTIVE && terminalDate == null;

        List<WorkplaceHistoryRowDto> rows = new ArrayList<>();
        for (int i = 0; i < workplaceEvents.size(); i++) {
            WorkplaceEvent event = workplaceEvents.get(i);
            LocalDate toDate = null;
            String toDateLabel = null;

            if (i < workplaceEvents.size() - 1) {
                toDate = workplaceEvents.get(i + 1).actionDate();
            } else if (active) {
                toDateLabel = "Present";
            } else if (terminalDate != null) {
                toDate = terminalDate;
            } else {
                toDateLabel = "Present";
            }

            rows.add(WorkplaceHistoryRowDto.builder()
                    .fromDate(event.actionDate())
                    .toDate(toDate)
                    .toDateLabel(toDateLabel)
                    .workingPlace(event.workingPlace())
                    .build());
        }

        return rows;
    }

    private List<WorkplaceHistoryRowDto> buildFallbackHistory(Employee employee) {
        LocalDate fromDate = employee.getDateOfFirstAppointment();
        if (fromDate == null) {
            fromDate = employee.getReportedDateToPresentWorkingPlace();
        }
        if (fromDate == null) {
            return List.of();
        }

        String workingPlace = employee.getCurrentWorkingPlace();
        if (workingPlace == null || workingPlace.isBlank()) {
            workingPlace = formatWorkingPlace(
                    employee.getCurrentDepartment(),
                    employee.getCurrentOffice()
            );
        }
        if (workingPlace == null || workingPlace.isBlank()) {
            return List.of();
        }

        String toDateLabel = employee.getStatus() == EmployeeStatus.ACTIVE
                ? "Present"
                : null;

        return List.of(WorkplaceHistoryRowDto.builder()
                .fromDate(fromDate)
                .toDateLabel(toDateLabel)
                .workingPlace(workingPlace)
                .build());
    }

    private boolean isWorkplaceChangingEvent(EmployeeAction action) {
        if (!WORKPLACE_CHANGING_TYPES.contains(action.getActionType())) {
            return false;
        }
        if (action.getActionType() == EmployeeActionType.TRANSFER_IN
                && action.getLinkedActionId() != null) {
            return false;
        }
        return true;
    }

    private String resolveWorkingPlaceAfterEvent(EmployeeAction action) {
        return switch (action.getActionType()) {
            case NEW_APPOINTMENT -> formatWorkingPlace(
                    action.getDepartment(),
                    action.getOffice()
            );
            case OFFICE_CHANGE -> formatWorkingPlace(
                    action.getDepartment() != null
                            ? action.getDepartment()
                            : action.getToDepartment(),
                    action.getOffice() != null
                            ? action.getOffice()
                            : action.getToOffice()
            );
            case TRANSFER_OUT -> {
                if (action.getToDepartment() != null || action.getToOffice() != null) {
                    yield formatWorkingPlace(action.getToDepartment(), action.getToOffice());
                }
                yield formatWorkingPlace(action.getDepartment(), action.getOffice());
            }
            default -> null;
        };
    }

    private LocalDate findTerminalDate(List<EmployeeAction> actions) {
        LocalDate terminalDate = null;
        for (EmployeeAction action : actions) {
            if (TERMINAL_TYPES.contains(action.getActionType())) {
                terminalDate = action.getActionDate();
            }
        }
        return terminalDate;
    }

    static String formatWorkingPlace(String department, String office) {
        if (department == null && office == null) {
            return null;
        }
        if (department != null && office != null) {
            return department + " — " + office;
        }
        return department != null ? department : office;
    }

    private record WorkplaceEvent(LocalDate actionDate, String workingPlace) {
    }
}
