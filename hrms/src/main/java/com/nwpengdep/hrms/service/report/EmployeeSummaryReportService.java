package com.nwpengdep.hrms.service.report;

import com.nwpengdep.hrms.dto.EmployeeSummaryReportResponse;
import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.Month;
import java.time.format.TextStyle;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class EmployeeSummaryReportService {

    private static final int RETIREMENT_AGE_55 = 55;
    private static final int RETIREMENT_AGE_60 = 60;

    private final EmployeeRepository employeeRepository;
    private final EmployeeWorkplaceHistoryService workplaceHistoryService;

    @Transactional(readOnly = true)
    public EmployeeSummaryReportResponse generateReport(Long employeeId) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        return EmployeeSummaryReportResponse.builder()
                .employeeName(nvl(employee.getFullName()))
                .employeeNo(nvl(employee.getEmployeeNo()))
                .designation(employee.getDesignation() != null
                        ? nvl(employee.getDesignation().getDesignationName())
                        : "—")
                .dateOfBirth(employee.getDateOfBirth())
                .dateOfFirstAppointment(employee.getDateOfFirstAppointment())
                .nic(nvl(employee.getNic()))
                .incremantDate(formatIncremantDate(employee.getIncremantDate()))
                .salaryCode(employee.getDesignation() != null
                        ? nvl(employee.getDesignation().getSalaryCode())
                        : "—")
                .retirementDateAt55(employee.getDateOfBirth() != null
                        ? employee.getDateOfBirth().plusYears(RETIREMENT_AGE_55)
                        : null)
                .retirementDateAt60(employee.getDateOfBirth() != null
                        ? employee.getDateOfBirth().plusYears(RETIREMENT_AGE_60)
                        : null)
                .enteredDateToNWPCouncil(employee.getEnteredDateToNWPCouncil())
                .currentWorkingPlace(nvl(employee.getCurrentWorkingPlace()))
                .workplaceHistory(workplaceHistoryService.buildHistory(employee))
                .generatedAt(LocalDateTime.now())
                .build();
    }

    static String formatIncremantDate(String value) {
        if (value == null || value.isBlank()) {
            return "—";
        }

        String trimmed = value.trim();
        if (trimmed.matches("^\\d{2}-\\d{2}$")) {
            int month = Integer.parseInt(trimmed.substring(0, 2));
            int day = Integer.parseInt(trimmed.substring(3, 5));
            if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
                String monthLabel = Month.of(month)
                        .getDisplayName(TextStyle.SHORT, Locale.ENGLISH);
                return String.format("%02d %s", day, monthLabel);
            }
        }

        return trimmed;
    }

    private static String nvl(String value) {
        return value != null && !value.isBlank() ? value : "—";
    }
}
