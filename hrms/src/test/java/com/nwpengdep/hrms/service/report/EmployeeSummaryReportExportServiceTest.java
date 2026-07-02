package com.nwpengdep.hrms.service.report;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.nwpengdep.hrms.dto.EmployeeSummaryReportResponse;
import com.nwpengdep.hrms.dto.WorkplaceHistoryRowDto;

@ExtendWith(MockitoExtension.class)
class EmployeeSummaryReportExportServiceTest {

    @Mock
    private EmployeeSummaryReportService employeeSummaryReportService;

    @InjectMocks
    private EmployeeSummaryReportExportService exportService;

    @Test
    void exportPdfReturnsNonEmptyPdfBytes() {
        EmployeeSummaryReportResponse report = EmployeeSummaryReportResponse.builder()
                .employeeName("Jane Smith")
                .employeeNo("7")
                .designation("Technical Officer")
                .dateOfBirth(LocalDate.of(1985, 8, 20))
                .dateOfFirstAppointment(LocalDate.of(2010, 2, 1))
                .nic("987654321V")
                .incremantDate("01 Jan")
                .widowsOrphansPensionNo("WOP-99")
                .salaryCode("SC-02")
                .retirementDateAt55(LocalDate.of(2040, 8, 20))
                .retirementDateAt60(LocalDate.of(2045, 8, 20))
                .enteredDateToNWPCouncil(LocalDate.of(2012, 6, 1))
                .currentWorkingPlace("NWP Engineering Dept — Head Office")
                .workplaceHistory(List.of(
                        WorkplaceHistoryRowDto.builder()
                                .fromDate(LocalDate.of(2010, 2, 1))
                                .toDateLabel("Present")
                                .workingPlace("NWP Engineering Dept — Head Office")
                                .build()
                ))
                .generatedAt(LocalDateTime.of(2026, 6, 18, 10, 0))
                .build();

        when(employeeSummaryReportService.generateReport(7L)).thenReturn(report);

        byte[] pdf = exportService.exportPdf(7L);

        assertTrue(pdf.length > 100);
        assertTrue(pdf[0] == '%' && pdf[1] == 'P' && pdf[2] == 'D' && pdf[3] == 'F');
    }
}
