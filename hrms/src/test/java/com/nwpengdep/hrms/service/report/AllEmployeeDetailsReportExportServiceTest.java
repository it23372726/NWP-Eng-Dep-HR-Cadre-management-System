package com.nwpengdep.hrms.service.report;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

import java.io.ByteArrayInputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.lowagie.text.pdf.PdfReader;
import com.lowagie.text.pdf.parser.PdfTextExtractor;
import com.nwpengdep.hrms.dto.AllEmployeeDetailsReportResponse;
import com.nwpengdep.hrms.dto.AllEmployeeDetailsReportRowResponse;
import com.nwpengdep.hrms.dto.OrganizationSettingsResponse;
import com.nwpengdep.hrms.service.OrganizationSettingsService;

@ExtendWith(MockitoExtension.class)
class AllEmployeeDetailsReportExportServiceTest {

    @Mock
    private AllEmployeeDetailsReportService reportService;

    @Mock
    private OrganizationSettingsService organizationSettingsService;

    @InjectMocks
    private AllEmployeeDetailsReportExportService exportService;

    @Test
    void excelExportUsesThinGridAndExpandsWrappedRows() throws Exception {
        stubBranding();
        AllEmployeeDetailsReportResponse report = sampleReport(1);

        try (XSSFWorkbook workbook = new XSSFWorkbook(
                new ByteArrayInputStream(exportService.exportExcel(report)))) {
            Sheet sheet = workbook.getSheet("All Employee Details");
            assertNotNull(sheet);
            assertEquals("NWP ENGINEERING DEPARTMENT",
                    sheet.getRow(0).getCell(0).getStringCellValue());
            assertEquals("ALL EMPLOYEE DETAILS REPORT",
                    sheet.getRow(1).getCell(0).getStringCellValue());
            assertEquals("Total Employees: 1",
                    sheet.getRow(2).getCell(0).getStringCellValue());
            assertEquals("Generated: 19-08-2026",
                    sheet.getRow(3).getCell(0).getStringCellValue());

            assertEquals("S/N", sheet.getRow(5).getCell(0).getStringCellValue());
            assertEquals(BorderStyle.THIN,
                    sheet.getRow(5).getCell(0).getCellStyle().getBorderTop());
            assertEquals(BorderStyle.THIN,
                    sheet.getRow(5).getCell(21).getCellStyle().getBorderRight());
            assertEquals(BorderStyle.THIN,
                    sheet.getRow(6).getCell(0).getCellStyle().getBorderBottom());
            assertTrue(sheet.getRow(6).getHeightInPoints() > 21f);
            assertEquals(6, sheet.getLastRowNum());
        }
    }

    @Test
    void excelExportUsesProvidedFilteredRowsOnly() throws Exception {
        stubBranding();
        AllEmployeeDetailsReportRowResponse included = sampleRow(1, "Included Employee");
        AllEmployeeDetailsReportResponse filtered = AllEmployeeDetailsReportResponse.builder()
                .generatedAt(LocalDateTime.of(2026, 8, 19, 11, 0))
                .totalCount(99)
                .reportTitle("ALL EMPLOYEE DETAILS REPORT\nDistrict: Kurunegala")
                .rows(List.of(included))
                .build();

        try (XSSFWorkbook workbook = new XSSFWorkbook(
                new ByteArrayInputStream(exportService.exportExcel(filtered)))) {
            Sheet sheet = workbook.getSheet("All Employee Details");
            assertEquals(
                    "ALL EMPLOYEE DETAILS REPORT\nDistrict: Kurunegala",
                    sheet.getRow(1).getCell(0).getStringCellValue()
            );
            assertEquals("Total Employees: 1",
                    sheet.getRow(2).getCell(0).getStringCellValue());
            assertEquals("Included Employee",
                    sheet.getRow(6).getCell(1).getStringCellValue());
            assertEquals(6, sheet.getLastRowNum());
        }
    }

    @Test
    void pdfExportMirrorsExcelTitlesLayoutAndTableContent() throws Exception {
        stubBranding();
        AllEmployeeDetailsReportResponse report = sampleReport(1);

        PdfReader reader = new PdfReader(exportService.exportPdf(report));
        assertEquals(0, reader.getPageRotation(1));
        assertEquals(1871.111f, reader.getPageSize(1).getWidth(), 0.2f);
        assertEquals(1322.222f, reader.getPageSize(1).getHeight(), 0.2f);

        PdfTextExtractor extractor = new PdfTextExtractor(reader);
        StringBuilder text = new StringBuilder();
        for (int page = 1; page <= reader.getNumberOfPages(); page++) {
            text.append(extractor.getTextFromPage(page));
        }
        reader.close();

        String content = text.toString().replace('\u00a0', ' ');
        assertTrue(content.contains("NWP ENGINEERING DEPARTMENT"));
        assertTrue(content.contains("ALL EMPLOYEE DETAILS REPORT"));
        assertTrue(content.contains("Total Employees: 1"));
        assertTrue(content.contains("Generated: 19-08-2026"));
        assertTrue(content.contains("Name of the Employee"));
        assertTrue(content.contains("Engineer"));
        assertFalse(content.contains("Prepared By:"));
        assertFalse(content.contains("Checked By:"));
    }

    private void stubBranding() {
        when(organizationSettingsService.getSettings()).thenReturn(
                OrganizationSettingsResponse.builder()
                        .reportHeaderUppercase("NWP ENGINEERING DEPARTMENT")
                        .reportHeaderSubtitle("NWP Engineering Department")
                        .build()
        );
    }

    private AllEmployeeDetailsReportResponse sampleReport(int totalCount) {
        return AllEmployeeDetailsReportResponse.builder()
                .generatedAt(LocalDateTime.of(2026, 8, 19, 11, 0))
                .totalCount(totalCount)
                .rows(List.of(sampleRow(1, "Sample Employee")))
                .build();
    }

    private AllEmployeeDetailsReportRowResponse sampleRow(int serialNo, String name) {
        return AllEmployeeDetailsReportRowResponse.builder()
                .serialNo(serialNo)
                .employeeName(name)
                .designation("Engineer")
                .nic("901234567V")
                .dateOfBirth(LocalDate.of(1990, 1, 15))
                .gender("Male")
                .serviceCategory("Engineering")
                .service("Sri Lanka Engineering Service")
                .salaryCode("SL1-2025")
                .grade("II")
                .natureOfAppointment("Permanent")
                .dateOfFirstAppointment(LocalDate.of(2015, 3, 1))
                .incremantDate("March 01")
                .currentWorkingPlace("Provincial Engineering Department")
                .currentDistrictOfWorking("Kurunegala")
                .permanentAddress(
                        "A deliberately long permanent address that wraps "
                                + "onto multiple lines in the exported report"
                )
                .residentDistrict("Kurunegala")
                .contactNo("0712345678")
                .build();
    }
}
