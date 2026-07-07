package com.nwpengdep.hrms.service.report;

import com.nwpengdep.hrms.constants.DepartmentConstants;
import com.nwpengdep.hrms.dto.ChangesReportRequest;
import com.nwpengdep.hrms.dto.ChangesReportResponse;
import com.nwpengdep.hrms.dto.ChangesReportRowResponse;
import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.entity.EmployeeAction;
import com.nwpengdep.hrms.entity.EmployeeActionType;
import com.nwpengdep.hrms.entity.EmploymentType;
import com.nwpengdep.hrms.repository.EmployeeActionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Month;
import java.time.format.TextStyle;
import java.util.EnumMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

@Service
@RequiredArgsConstructor
public class ChangesReportService {

    private static final Map<EmployeeActionType, String> ACTION_LABELS =
            new EnumMap<>(EmployeeActionType.class);

    private static final Map<EmploymentType, String> EMPLOYMENT_TYPE_LABELS =
            new EnumMap<>(EmploymentType.class);

    static {
        ACTION_LABELS.put(EmployeeActionType.NEW_APPOINTMENT, "New Appointment");
        ACTION_LABELS.put(EmployeeActionType.TRANSFER_IN, "Transfer In");
        ACTION_LABELS.put(EmployeeActionType.TRANSFER_OUT, "Transfer Out");
        ACTION_LABELS.put(EmployeeActionType.PROMOTION, "Promotion");
        ACTION_LABELS.put(
                EmployeeActionType.ASSIGNMENT_GRADE_UPDATE,
                "Assignment / Grade Update"
        );
        ACTION_LABELS.put(
                EmployeeActionType.PERMANENT_CONFIRMATION,
                "Permanent Confirmation"
        );
        ACTION_LABELS.put(EmployeeActionType.OFFICE_CHANGE, "Office Change");
        ACTION_LABELS.put(
                EmployeeActionType.RETIREMENT_OR_RESIGNATION,
                "Retirement / Resignation"
        );
        ACTION_LABELS.put(EmployeeActionType.DEATH, "Death");
        ACTION_LABELS.put(EmployeeActionType.DISMISSAL, "Dismissal");
        ACTION_LABELS.put(EmployeeActionType.VACATION_OF_POST, "Vacation of Post");

        EMPLOYMENT_TYPE_LABELS.put(EmploymentType.PERMANENT, "Permanent");
        EMPLOYMENT_TYPE_LABELS.put(EmploymentType.ACTING, "Acting");
        EMPLOYMENT_TYPE_LABELS.put(EmploymentType.CASUAL, "Casual");
        EMPLOYMENT_TYPE_LABELS.put(EmploymentType.SUBSTITUTE, "Substitute");
        EMPLOYMENT_TYPE_LABELS.put(EmploymentType.CONTRACT, "Contract");
    }

    private final EmployeeActionRepository employeeActionRepository;

    @Transactional(readOnly = true)
    public ChangesReportResponse generateReport(ChangesReportRequest request) {
        LocalDate periodStart = LocalDate.of(request.getYear(), request.getMonth(), 1);
        LocalDate periodEnd = periodStart.withDayOfMonth(periodStart.lengthOfMonth());

        List<EmployeeAction> actions = employeeActionRepository
                .findActionsBetweenDates(periodStart, periodEnd)
                .stream()
                .filter(this::isNwpAction)
                .filter(action -> !isAutoCreatedTransferIn(action))
                .toList();

        AtomicInteger serial = new AtomicInteger(1);
        List<ChangesReportRowResponse> rows = actions.stream()
                .map(action -> toRow(action, serial.getAndIncrement()))
                .toList();

        String monthLabel = Month.of(request.getMonth())
                .getDisplayName(TextStyle.FULL, Locale.ENGLISH);

        return ChangesReportResponse.builder()
                .year(request.getYear())
                .month(request.getMonth())
                .monthLabel(monthLabel)
                .generatedAt(LocalDateTime.now())
                .rows(rows)
                .totalCount(rows.size())
                .build();
    }

    private ChangesReportRowResponse toRow(EmployeeAction action, int serialNo) {
        Employee employee = action.getEmployee();

        return ChangesReportRowResponse.builder()
                .serialNo(serialNo)
                .fullName(employee != null ? employee.getFullName() : "Unknown")
                .designation(resolveDesignation(action, employee))
                .nic(employee != null ? employee.getNic() : null)
                .employmentType(formatEmploymentType(employee))
                .action(formatAction(action))
                .actionDate(action.getActionDate())
                .build();
    }

    private String resolveDesignation(EmployeeAction action, Employee employee) {
        if (usesOldDesignation(action)) {
            String oldDesignation = resolveOldDesignationName(action);
            if (oldDesignation != null) {
                return oldDesignation;
            }
        }

        String newDesignation = resolveNewDesignationName(action);
        if (newDesignation != null) {
            return newDesignation;
        }

        String oldDesignation = resolveOldDesignationName(action);
        if (oldDesignation != null) {
            return oldDesignation;
        }

        if (employee != null) {
            if (employee.getSpecialDesignationName() != null
                    && !employee.getSpecialDesignationName().isBlank()) {
                return employee.getSpecialDesignationName();
            }
            if (employee.getRecordedDesignationName() != null
                    && !employee.getRecordedDesignationName().isBlank()) {
                return employee.getRecordedDesignationName();
            }
            if (employee.getDesignation() != null) {
                return employee.getDesignation().getDesignationName();
            }
        }

        return "";
    }

    private boolean usesOldDesignation(EmployeeAction action) {
        return switch (action.getActionType()) {
            case TRANSFER_OUT,
                    RETIREMENT_OR_RESIGNATION,
                    DEATH,
                    DISMISSAL,
                    VACATION_OF_POST -> true;
            case PROMOTION -> isPromotionOut(action);
            default -> false;
        };
    }

    private boolean isPromotionOut(EmployeeAction action) {
        if (action.getActionType() != EmployeeActionType.PROMOTION) {
            return false;
        }
        if (DepartmentConstants.isNwpEngineering(action.getFromDepartment())) {
            return true;
        }
        return DepartmentConstants.isNwpEngineering(action.getDepartment())
                && action.getToDepartment() != null
                && !DepartmentConstants.isNwpEngineering(action.getToDepartment());
    }

    private String resolveNewDesignationName(EmployeeAction action) {
        if (action.getRecordedSpecialDesignationName() != null
                && !action.getRecordedSpecialDesignationName().isBlank()) {
            return action.getRecordedSpecialDesignationName();
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

    private String resolveOldDesignationName(EmployeeAction action) {
        if (action.getOldDesignation() != null) {
            return action.getOldDesignation().getDesignationName();
        }
        return null;
    }

    private String formatAction(EmployeeAction action) {
        return ACTION_LABELS.getOrDefault(
                action.getActionType(),
                action.getActionType().name().replace('_', ' ')
        );
    }

    private String formatEmploymentType(Employee employee) {
        if (employee == null || employee.getEmploymentType() == null) {
            return "";
        }
        return EMPLOYMENT_TYPE_LABELS.getOrDefault(
                employee.getEmploymentType(),
                employee.getEmploymentType().name()
        );
    }

    private boolean isAutoCreatedTransferIn(EmployeeAction action) {
        return action.getActionType() == EmployeeActionType.TRANSFER_IN
                && action.getLinkedActionId() != null;
    }

    private boolean isNwpAction(EmployeeAction action) {
        if (DepartmentConstants.isNwpEngineering(action.getDepartment())) {
            return true;
        }
        if (DepartmentConstants.isNwpEngineering(action.getFromDepartment())) {
            return true;
        }
        if (DepartmentConstants.isNwpEngineering(action.getToDepartment())) {
            return true;
        }
        Employee employee = action.getEmployee();
        return employee != null && isNwpEmployee(employee);
    }

    private boolean isNwpEmployee(Employee employee) {
        return DepartmentConstants.isNwpEngineering(employee.getCurrentDepartment());
    }
}
