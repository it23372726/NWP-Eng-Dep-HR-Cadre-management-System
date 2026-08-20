package com.nwpengdep.hrms.service.report;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import java.io.ByteArrayInputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.lowagie.text.pdf.PdfReader;
import com.lowagie.text.pdf.parser.PdfTextExtractor;

import com.nwpengdep.hrms.dto.CadreReportRequest;
import com.nwpengdep.hrms.dto.CadreReportResponse;
import com.nwpengdep.hrms.dto.CadreReportRowResponse;
import com.nwpengdep.hrms.dto.OrganizationSettingsResponse;
import com.nwpengdep.hrms.service.OrganizationSettingsService;

@ExtendWith(MockitoExtension.class)
class CadreReportExportServiceTest {

    private static final int TOTAL_COLUMNS = 23;
    private static final int HEADER_FIRST_ROW = 4;
    private static final int HEADER_LAST_ROW = 6;
    private static final int CHANGES_START_COL = 8;
    private static final int CHANGES_END_COL = 15;
    private static final int PARTICULARS_START_COL = 16;

    @Mock
    private CadreReportService cadreReportService;

    @Mock
    private OrganizationSettingsService organizationSettingsService;

    @InjectMocks
    private CadreReportExportService exportService;

    @Test
    void excelExportFillsHeaderGridAndDrawsTableOutlines() throws Exception {
        CadreReportRequest request = new CadreReportRequest();
        request.setStartDate(LocalDate.of(2025, 12, 31));
        request.setEndDate(LocalDate.of(2026, 8, 19));

        CadreReportRowResponse dataRow = CadreReportRowResponse.builder()
                .serialNo(1)
                .designationName("Engineer")
                .serviceCode("SLEng")
                .gradeClassDisplay("II")
                .salaryCode("MN-1")
                .serviceLevelName("Senior")
                .finalApprovedCadre(5)
                .employeesAtStartDate(4)
                .permanent(4)
                .vacancies(1)
                .totalStaff(4)
                .build();
        CadreReportRowResponse totals = CadreReportRowResponse.builder()
                .serialNo(0)
                .designationName("TOTAL")
                .totalsRow(true)
                .finalApprovedCadre(5)
                .employeesAtStartDate(4)
                .permanent(4)
                .vacancies(1)
                .totalStaff(4)
                .build();

        when(cadreReportService.generateReport(any())).thenReturn(
                CadreReportResponse.builder()
                        .startDate(request.getStartDate())
                        .endDate(request.getEndDate())
                        .generatedAt(LocalDateTime.of(2026, 8, 19, 11, 0))
                        .rows(List.of(dataRow))
                        .totals(totals)
                        .build()
        );
        when(organizationSettingsService.getSettings()).thenReturn(
                OrganizationSettingsResponse.builder()
                        .reportHeaderUppercase("NWP ENGINEERING DEPARTMENT")
                        .reportHeaderSubtitle("NWP Engineering Department")
                        .build()
        );

        byte[] excel = exportService.exportExcel(request);
        assertTrue(excel.length > 100);

        try (XSSFWorkbook workbook = new XSSFWorkbook(new ByteArrayInputStream(excel))) {
            Sheet sheet = workbook.getSheet("Cadre Report");
            assertNotNull(sheet);

            for (int rowIdx = HEADER_FIRST_ROW; rowIdx <= HEADER_LAST_ROW; rowIdx++) {
                Row row = sheet.getRow(rowIdx);
                assertNotNull(row, "header row " + rowIdx);
                for (int col = 0; col < TOTAL_COLUMNS; col++) {
                    Cell cell = row.getCell(col);
                    assertNotNull(cell, "header cell " + rowIdx + ":" + col);
                    assertNotEquals(
                            BorderStyle.NONE,
                            cell.getCellStyle().getBorderLeft(),
                            "left border " + rowIdx + ":" + col
                    );
                    assertNotEquals(
                            BorderStyle.NONE,
                            cell.getCellStyle().getBorderRight(),
                            "right border " + rowIdx + ":" + col
                    );
                    assertNotEquals(
                            BorderStyle.NONE,
                            cell.getCellStyle().getBorderTop(),
                            "top border " + rowIdx + ":" + col
                    );
                    assertNotEquals(
                            BorderStyle.NONE,
                            cell.getCellStyle().getBorderBottom(),
                            "bottom border " + rowIdx + ":" + col
                    );
                }
            }

            assertEquals(BorderStyle.THIN, sheet.getRow(HEADER_FIRST_ROW)
                    .getCell(0).getCellStyle().getBorderLeft());
            assertEquals(BorderStyle.THIN, sheet.getRow(HEADER_FIRST_ROW)
                    .getCell(0).getCellStyle().getBorderTop());
            assertEquals(BorderStyle.THIN, sheet.getRow(HEADER_FIRST_ROW)
                    .getCell(TOTAL_COLUMNS - 1).getCellStyle().getBorderRight());
            assertEquals(BorderStyle.THIN, sheet.getRow(8)
                    .getCell(0).getCellStyle().getBorderBottom());
            assertEquals(BorderStyle.THIN, sheet.getRow(HEADER_FIRST_ROW)
                    .getCell(CHANGES_START_COL).getCellStyle().getBorderLeft());
            assertEquals(BorderStyle.THIN, sheet.getRow(HEADER_FIRST_ROW)
                    .getCell(PARTICULARS_START_COL).getCellStyle().getBorderLeft());

            assertTrue(hasMergedRegion(sheet, HEADER_FIRST_ROW, HEADER_FIRST_ROW,
                    CHANGES_START_COL, CHANGES_END_COL));
            assertTrue(hasMergedRegion(sheet, HEADER_FIRST_ROW, HEADER_FIRST_ROW,
                    PARTICULARS_START_COL, TOTAL_COLUMNS - 1));
            assertTrue(hasMergedRegion(sheet, HEADER_FIRST_ROW + 1, HEADER_FIRST_ROW + 1,
                    PARTICULARS_START_COL, TOTAL_COLUMNS - 1));
            assertTrue(hasMergedRegion(sheet, HEADER_FIRST_ROW, HEADER_LAST_ROW, 0, 0));
            assertEquals("Prepared By:", sheet.getRow(10).getCell(0).getStringCellValue());
            assertEquals("Checked By:", sheet.getRow(10).getCell(5).getStringCellValue());
        }
    }

    @Test
    void excelExportExpandsRowHeightForWrappedDesignation() throws Exception {
        CadreReportRequest request = new CadreReportRequest();
        request.setStartDate(LocalDate.of(2025, 12, 31));
        request.setEndDate(LocalDate.of(2026, 8, 19));

        CadreReportRowResponse shortRow = CadreReportRowResponse.builder()
                .serialNo(1)
                .designationName("Engineer")
                .build();
        CadreReportRowResponse wrappedRow = CadreReportRowResponse.builder()
                .serialNo(5)
                .designationName("Chief Engineer (Structure Design & Other Department)")
                .build();

        when(cadreReportService.generateReport(any())).thenReturn(
                CadreReportResponse.builder()
                        .startDate(request.getStartDate())
                        .endDate(request.getEndDate())
                        .generatedAt(LocalDateTime.of(2026, 8, 19, 11, 0))
                        .rows(List.of(shortRow, wrappedRow))
                        .build()
        );
        when(organizationSettingsService.getSettings()).thenReturn(
                OrganizationSettingsResponse.builder()
                        .reportHeaderUppercase("NWP ENGINEERING DEPARTMENT")
                        .reportHeaderSubtitle("NWP Engineering Department")
                        .build()
        );

        try (XSSFWorkbook workbook = new XSSFWorkbook(
                new ByteArrayInputStream(exportService.exportExcel(request)))) {
            Sheet sheet = workbook.getSheet("Cadre Report");
            float shortHeight = sheet.getRow(7).getHeightInPoints();
            float wrappedHeight = sheet.getRow(8).getHeightInPoints();

            assertEquals("Engineer", sheet.getRow(7).getCell(1).getStringCellValue());
            assertEquals(
                    "Chief Engineer (Structure Design & Other Department)",
                    sheet.getRow(8).getCell(1).getStringCellValue()
            );
            assertTrue(shortHeight >= 24f, "single-line rows still need padding");
            assertTrue(
                    wrappedHeight >= shortHeight + 10f,
                    "wrapped designation should grow the row, was "
                            + wrappedHeight
                            + " vs "
                            + shortHeight
            );
        }
    }

    @Test
    void pdfExportMirrorsExcelTitlesAndGroupedHeaders() throws Exception {
        CadreReportRequest request = new CadreReportRequest();
        request.setStartDate(LocalDate.of(2025, 12, 31));
        request.setEndDate(LocalDate.of(2026, 8, 19));

        when(cadreReportService.generateReport(any())).thenReturn(
                CadreReportResponse.builder()
                        .startDate(request.getStartDate())
                        .endDate(request.getEndDate())
                        .generatedAt(LocalDateTime.of(2026, 8, 19, 11, 0))
                        .rows(List.of(
                                CadreReportRowResponse.builder()
                                        .serialNo(5)
                                        .designationName(
                                                "Chief Engineer (Structure Design & Other Department)"
                                        )
                                        .serviceCode("SLEgS")
                                        .gradeClassDisplay("I")
                                        .salaryCode("SL1-2025")
                                        .serviceLevelName("Senior")
                                        .build()
                        ))
                        .totals(CadreReportRowResponse.builder()
                                .serialNo(0)
                                .designationName("TOTAL")
                                .totalsRow(true)
                                .build())
                        .build()
        );
        when(organizationSettingsService.getSettings()).thenReturn(
                OrganizationSettingsResponse.builder()
                        .reportHeaderUppercase("NWP ENGINEERING DEPARTMENT")
                        .reportHeaderSubtitle("NWP Engineering Department")
                        .build()
        );

        byte[] pdf = exportService.exportPdf(request);
        assertTrue(pdf.length > 100);
        assertEquals('%', (char) pdf[0]);
        assertEquals('P', (char) pdf[1]);
        assertEquals('D', (char) pdf[2]);
        assertEquals('F', (char) pdf[3]);

        PdfReader reader = new PdfReader(pdf);
        com.lowagie.text.Rectangle pageSize = reader.getPageSize(1);
        assertEquals(0, reader.getPageRotation(1));
        assertEquals(1871.111f, pageSize.getWidth(), 0.2f);
        assertEquals(1322.222f, pageSize.getHeight(), 0.2f);
        assertEquals(1, reader.getNumberOfPages());

        PdfTextExtractor extractor = new PdfTextExtractor(reader);
        StringBuilder text = new StringBuilder();
        for (int page = 1; page <= reader.getNumberOfPages(); page++) {
            text.append(extractor.getTextFromPage(page));
        }
        reader.close();

        String content = text.toString().replace('\u00a0', ' ');
        assertTrue(content.contains("NWP ENGINEERING DEPARTMENT"));
        assertTrue(content.contains("CADRE REPORT"));
        assertTrue(content.contains("From:"));
        assertTrue(content.contains("31-12-2025"));
        assertTrue(content.contains("19-08-2026"));
        assertFalse(content.contains("Generated:"));
        assertTrue(content.contains("Changes Between"));
        assertTrue(content.contains("Existing cadre"));
        assertTrue(content.contains("Chief Engineer"));
        assertTrue(content.contains("SL1-2025"));
        assertTrue(content.contains("TOTAL"));
        assertTrue(content.contains("Prepared By:"));
        assertTrue(content.contains("Checked By:"));
    }

    @Test
    void pdfExportKeepsFullCadreListOnOneLandscapePage() throws Exception {
        CadreReportRequest request = new CadreReportRequest();
        request.setStartDate(LocalDate.of(2025, 12, 31));
        request.setEndDate(LocalDate.of(2026, 8, 19));

        java.util.ArrayList<CadreReportRowResponse> rows = new java.util.ArrayList<>();
        for (int i = 1; i <= 25; i++) {
            rows.add(CadreReportRowResponse.builder()
                    .serialNo(i)
                    .designationName(i == 5
                            ? "Chief Engineer (Structure Design & Other Department)"
                            : "Designation " + i)
                    .serviceCode("SLEgS")
                    .gradeClassDisplay("I")
                    .salaryCode("SL1-2025")
                    .serviceLevelName("Senior")
                    .finalApprovedCadre(1)
                    .build());
        }

        when(cadreReportService.generateReport(any())).thenReturn(
                CadreReportResponse.builder()
                        .startDate(request.getStartDate())
                        .endDate(request.getEndDate())
                        .generatedAt(LocalDateTime.of(2026, 8, 19, 11, 0))
                        .rows(rows)
                        .totals(CadreReportRowResponse.builder()
                                .serialNo(0)
                                .designationName("TOTAL")
                                .totalsRow(true)
                                .finalApprovedCadre(25)
                                .build())
                        .build()
        );
        when(organizationSettingsService.getSettings()).thenReturn(
                OrganizationSettingsResponse.builder()
                        .reportHeaderUppercase("NWP ENGINEERING DEPARTMENT")
                        .build()
        );

        PdfReader reader = new PdfReader(exportService.exportPdf(request));
        assertEquals(1, reader.getNumberOfPages());
        assertEquals(1871.111f, reader.getPageSize(1).getWidth(), 0.2f);
        reader.close();
    }

    private boolean hasMergedRegion(
            Sheet sheet,
            int firstRow,
            int lastRow,
            int firstCol,
            int lastCol
    ) {
        for (int i = 0; i < sheet.getNumMergedRegions(); i++) {
            CellRangeAddress region = sheet.getMergedRegion(i);
            if (region.getFirstRow() == firstRow
                    && region.getLastRow() == lastRow
                    && region.getFirstColumn() == firstCol
                    && region.getLastColumn() == lastCol) {
                return true;
            }
        }
        return false;
    }
}
