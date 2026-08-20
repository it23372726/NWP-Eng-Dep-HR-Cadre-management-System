package com.nwpengdep.hrms.service.report;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
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
import com.nwpengdep.hrms.dto.ChangesReportRequest;
import com.nwpengdep.hrms.dto.ChangesReportResponse;
import com.nwpengdep.hrms.dto.ChangesReportRowResponse;
import com.nwpengdep.hrms.dto.OrganizationSettingsResponse;
import com.nwpengdep.hrms.service.OrganizationSettingsService;

@ExtendWith(MockitoExtension.class)
class ChangesReportExportServiceTest {

    @Mock
    private ChangesReportService changesReportService;

    @Mock
    private OrganizationSettingsService organizationSettingsService;

    @InjectMocks
    private ChangesReportExportService exportService;

    @Test
    void excelExportUsesThinGridAndMirrorsPdfTitles() throws Exception {
        stubBrandingAndReport();

        try (XSSFWorkbook workbook = new XSSFWorkbook(
                new ByteArrayInputStream(exportService.exportExcel(sampleRequest())))) {
            Sheet sheet = workbook.getSheet("Changes Report");
            assertNotNull(sheet);
            assertEquals("NWP ENGINEERING DEPARTMENT",
                    sheet.getRow(0).getCell(0).getStringCellValue());
            assertEquals("CHANGES REPORT",
                    sheet.getRow(1).getCell(0).getStringCellValue());
            assertEquals("Period: August 2026",
                    sheet.getRow(2).getCell(0).getStringCellValue());
            assertEquals("Total Changes: 1",
                    sheet.getRow(3).getCell(0).getStringCellValue());
            assertEquals("Generated: 19-08-2026",
                    sheet.getRow(4).getCell(0).getStringCellValue());

            assertEquals("No", sheet.getRow(6).getCell(0).getStringCellValue());
            assertEquals("Full Name", sheet.getRow(6).getCell(1).getStringCellValue());
            assertEquals(BorderStyle.THIN,
                    sheet.getRow(6).getCell(0).getCellStyle().getBorderTop());
            assertEquals(BorderStyle.THIN,
                    sheet.getRow(6).getCell(6).getCellStyle().getBorderRight());
            assertEquals(BorderStyle.THIN,
                    sheet.getRow(7).getCell(0).getCellStyle().getBorderBottom());
            assertEquals("Sample Employee",
                    sheet.getRow(7).getCell(1).getStringCellValue());
            assertEquals("19-08-2026",
                    sheet.getRow(7).getCell(6).getStringCellValue());
            assertEquals(7, sheet.getLastRowNum());
        }
    }

    @Test
    void pdfExportMirrorsExcelTitlesLayoutAndTableContent() throws Exception {
        stubBrandingAndReport();

        PdfReader reader = new PdfReader(exportService.exportPdf(sampleRequest()));
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
        assertTrue(content.contains("CHANGES REPORT"));
        assertTrue(content.contains("Period: August 2026"));
        assertTrue(content.contains("Total Changes: 1"));
        assertTrue(content.contains("Generated: 19-08-2026"));
        assertTrue(content.contains("Full Name"));
        assertTrue(content.contains("Sample Employee"));
        assertTrue(content.contains("New Appointment"));
        assertFalse(content.contains("Prepared By:"));
        assertFalse(content.contains("Checked By:"));
    }

    private void stubBrandingAndReport() {
        when(organizationSettingsService.getSettings()).thenReturn(
                OrganizationSettingsResponse.builder()
                        .reportHeaderUppercase("NWP ENGINEERING DEPARTMENT")
                        .reportHeaderSubtitle("NWP Engineering Department")
                        .build()
        );
        when(changesReportService.generateReport(any())).thenReturn(sampleReport());
    }

    private ChangesReportRequest sampleRequest() {
        ChangesReportRequest request = new ChangesReportRequest();
        request.setYear(2026);
        request.setMonth(8);
        return request;
    }

    private ChangesReportResponse sampleReport() {
        return ChangesReportResponse.builder()
                .year(2026)
                .month(8)
                .monthLabel("August")
                .generatedAt(LocalDateTime.of(2026, 8, 19, 11, 0))
                .totalCount(1)
                .rows(List.of(ChangesReportRowResponse.builder()
                        .serialNo(1)
                        .fullName("Sample Employee")
                        .designation("Engineer")
                        .nic("901234567V")
                        .employmentType("Permanent")
                        .action("New Appointment")
                        .actionDate(LocalDate.of(2026, 8, 19))
                        .build()))
                .build();
    }
}
