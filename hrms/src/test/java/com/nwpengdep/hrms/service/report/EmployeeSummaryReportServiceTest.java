package com.nwpengdep.hrms.service.report;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.nwpengdep.hrms.dto.EmployeeSummaryReportResponse;
import com.nwpengdep.hrms.dto.WorkplaceHistoryRowDto;
import com.nwpengdep.hrms.entity.Designation;
import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.repository.EmployeeRepository;

@ExtendWith(MockitoExtension.class)
class EmployeeSummaryReportServiceTest {

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private EmployeeWorkplaceHistoryService workplaceHistoryService;

    @InjectMocks
    private EmployeeSummaryReportService employeeSummaryReportService;

    @Test
    void generateReportComputesRetirementDatesFromDateOfBirth() {
        Designation designation = Designation.builder()
                .designationName("Engineer")
                .salaryCode("SC-01")
                .build();
        Employee employee = Employee.builder()
                .id(10L)
                .fullName("John Doe")
                .employeeNo("42")
                .nic("123456789V")
                .dateOfBirth(LocalDate.of(1970, 4, 15))
                .dateOfFirstAppointment(LocalDate.of(1995, 1, 1))
                .enteredDateToNWPCouncil(LocalDate.of(2005, 3, 1))
                .currentWorkingPlace("NWP Engineering Dept — Head Office")
                .designation(designation)
                .build();
        employee.setIncremantDate("07-15");
        employee.setWidowsOrphansPensionNo("WOP-12345");

        when(employeeRepository.findById(10L)).thenReturn(Optional.of(employee));
        when(workplaceHistoryService.buildHistory(any(Employee.class)))
                .thenReturn(List.of(WorkplaceHistoryRowDto.builder()
                        .fromDate(LocalDate.of(1995, 1, 1))
                        .toDateLabel("Present")
                        .workingPlace("NWP Engineering Dept — Head Office")
                        .build()));

        EmployeeSummaryReportResponse report =
                employeeSummaryReportService.generateReport(10L);

        assertEquals("John Doe", report.getEmployeeName());
        assertEquals("Engineer", report.getDesignation());
        assertEquals("SC-01", report.getSalaryCode());
        assertEquals("15 Jul", report.getIncremantDate());
        assertEquals("WOP-12345", report.getWidowsOrphansPensionNo());
        assertEquals(LocalDate.of(2025, 4, 15), report.getRetirementDateAt55());
        assertEquals(LocalDate.of(2030, 4, 15), report.getRetirementDateAt60());
        assertNotNull(report.getGeneratedAt());
        assertEquals(1, report.getWorkplaceHistory().size());
    }

    @Test
    void generateReportThrowsWhenEmployeeNotFound() {
        when(employeeRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(
                RuntimeException.class,
                () -> employeeSummaryReportService.generateReport(99L)
        );
    }

    @Test
    void formatIncremantDateFormatsMonthDayValue() {
        assertEquals("15 Jul", EmployeeSummaryReportService.formatIncremantDate("07-15"));
        assertEquals("—", EmployeeSummaryReportService.formatIncremantDate(null));
        assertEquals("—", EmployeeSummaryReportService.formatIncremantDate(""));
    }
}
