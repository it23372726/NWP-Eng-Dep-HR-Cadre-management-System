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

import com.nwpengdep.hrms.dto.EmployeeDependentDetailsReportResponse;
import com.nwpengdep.hrms.entity.ChildRelationship;

@ExtendWith(MockitoExtension.class)
class EmployeeDependentDetailsReportExportServiceTest {

    @Mock
    private EmployeeDependentDetailsReportService reportService;

    @InjectMocks
    private EmployeeDependentDetailsReportExportService exportService;

    @Test
    void exportPdfReturnsNonEmptyPdfBytes() {
        EmployeeDependentDetailsReportResponse report =
                EmployeeDependentDetailsReportResponse.builder()
                        .employeeName("Jane Smith")
                        .employeeNo("EMP-007")
                        .nic("987654321V")
                        .dateOfBirth(LocalDate.of(1985, 8, 20))
                        .gender("Female")
                        .maritalStatus("Married")
                        .contactNo("0771234567")
                        .emailAddress("jane@example.com")
                        .permanentAddress("123 Main Street, Kurunegala")
                        .spouse(EmployeeDependentDetailsReportResponse.SpouseDetails.builder()
                                .nic("123456789V")
                                .fullName("John Smith")
                                .dateOfBirth(LocalDate.of(1984, 3, 15))
                                .build())
                        .children(List.of(
                                EmployeeDependentDetailsReportResponse.ChildDetails.builder()
                                        .nic("—")
                                        .birthCertificateNo("BC-001")
                                        .fullName("Alex Smith")
                                        .dateOfBirth(LocalDate.of(2012, 5, 10))
                                        .relationship(ChildRelationship.SON)
                                        .build()
                        ))
                        .generatedAt(LocalDateTime.of(2026, 6, 25, 10, 0))
                        .build();

        when(reportService.generateReport(7L)).thenReturn(report);

        byte[] pdf = exportService.exportPdf(7L);

        assertTrue(pdf.length > 100);
        assertTrue(pdf[0] == '%' && pdf[1] == 'P' && pdf[2] == 'D' && pdf[3] == 'F');
    }
}
