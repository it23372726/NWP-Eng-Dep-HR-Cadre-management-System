package com.nwpengdep.hrms.service.report;

import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.FontFactory;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.BaseFont;
import com.lowagie.text.pdf.ColumnText;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfPageEventHelper;
import com.lowagie.text.pdf.PdfWriter;
import com.nwpengdep.hrms.dto.CadreReportRequest;
import com.nwpengdep.hrms.dto.CadreReportResponse;
import com.nwpengdep.hrms.dto.CadreReportRowResponse;
import com.nwpengdep.hrms.dto.OrganizationSettingsResponse;
import com.nwpengdep.hrms.service.OrganizationSettingsService;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.BorderExtent;
import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.PrintSetup;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.VerticalAlignment;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.ss.util.PropertyTemplate;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
public class CadreReportExportService {

    private static final DateTimeFormatter DATE_FMT =
            DateTimeFormatter.ofPattern("dd-MM-yyyy");

    private static final String[] PREFIX_HEADERS = {
            "S/N",
            "Designation",
            "Service",
            "Grade/Class",
            "Salary Code",
            "Service Level",
            "Final Approved Cadre"
    };

    private static final String[] CHANGES_SUB_HEADERS = {
            "Transfer IN",
            "Transfer OUT",
            "Retired/Resignation",
            "Deaths",
            "Promotion",
            "New Appointment",
            "Dismissals",
            "Vacation of Post"
    };

    private static final String[] EXISTING_CADRE_SUB_HEADERS = {
            "Permanent",
            "Vacancies",
            "Excess",
            "Casual",
            "Substitute",
            "Contracts",
            "Total (Per + Cas + Sub + Cont)"
    };

    private static final int HEADER_ROW_COUNT = 3;

    private static final int CHANGES_START_COL = PREFIX_HEADERS.length + 1;
    private static final int EXISTING_CADRE_START_COL =
            CHANGES_START_COL + CHANGES_SUB_HEADERS.length;
    private static final int TOTAL_COLUMNS =
            EXISTING_CADRE_START_COL + EXISTING_CADRE_SUB_HEADERS.length;

    private static final int[] COLUMN_WIDTHS = {
            1600, 9000, 2800, 3400, 3200, 3600, 3400, 3700,
            2800, 2800, 3200, 2600, 2800, 3400, 2800, 3400,
            2600, 2600, 2600, 2600, 2900, 2900, 4100
    };

    private static final int DESIGNATION_COL = 1;
    private static final int SERVICE_COL = 2;
    private static final int GRADE_COL = 3;
    private static final int SALARY_COL = 4;
    private static final int SERVICE_LEVEL_COL = 5;

    private static final float DATA_ROW_MIN_HEIGHT_POINTS = 24f;
    private static final float DATA_ROW_LINE_HEIGHT_POINTS = 15f;
    private static final float DATA_ROW_PADDING_POINTS = 8f;

    /**
     * Geometry copied from Excel's Save-as-PDF output so type size and spacing match.
     */
    private static final float PDF_PAGE_WIDTH = 1871.111f;
    private static final float PDF_PAGE_HEIGHT = 1322.222f;
    private static final float PDF_MARGIN_LEFT = 48f;
    private static final float PDF_MARGIN_RIGHT = 66.111f;
    private static final float PDF_MARGIN_TOP = 89f;
    private static final float PDF_MARGIN_BOTTOM = 48f;
    private static final float[] PDF_COLUMN_WIDTHS = {
            38, 211, 66, 80, 75, 84, 80, 87,
            66, 66, 75, 61, 66, 80, 66, 80,
            61, 61, 61, 61, 68, 68, 96
    };
    private static final float TITLE_ROW_HEIGHT = 28f;
    private static final float SUBTITLE_ROW_HEIGHT = 24f;
    private static final float META_ROW_HEIGHT = 20f;
    private static final float TITLE_GAP_HEIGHT = 13.57f;
    private static final float HEADER_ROW1_HEIGHT = 36f;
    private static final float HEADER_ROW2_HEIGHT = 32f;
    private static final float HEADER_ROW3_HEIGHT = 30f;
    private static final float PDF_DATA_ROW_HEIGHT = 24f;
    private static final float PDF_WRAPPED_ROW_HEIGHT = 38f;
    private static final java.awt.Color HEADER_FILL = new java.awt.Color(192, 192, 192);

    private static com.lowagie.text.Rectangle cadrePdfPageSize() {
        return new com.lowagie.text.Rectangle(PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT);
    }

    private final CadreReportService cadreReportService;
    private final OrganizationSettingsService organizationSettingsService;

    public byte[] exportExcel(CadreReportRequest request) {
        CadreReportResponse report = cadreReportService.generateReport(request);
        OrganizationSettingsResponse branding = organizationSettingsService.getSettings();

        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            Sheet sheet = workbook.createSheet("Cadre Report");
            configurePageSetup(sheet);
            configureColumnWidths(sheet);
            ExcelStyles styles = createExcelStyles(workbook);

            int rowIdx = 0;
            createTitleRow(
                    sheet,
                    rowIdx++,
                    branding.getReportHeaderUppercase(),
                    styles.title
            );
            createTitleRow(sheet, rowIdx++, "CADRE REPORT", styles.subtitle);
            createTitleRow(
                    sheet,
                    rowIdx++,
                    fromToLabel(report),
                    styles.meta
            );
            rowIdx++;

            int headerRow1Idx = rowIdx;
            org.apache.poi.ss.usermodel.Row headerRow1 = sheet.createRow(rowIdx++);
            int headerRow2Idx = rowIdx;
            org.apache.poi.ss.usermodel.Row headerRow2 = sheet.createRow(rowIdx++);
            int headerRow3Idx = rowIdx;
            org.apache.poi.ss.usermodel.Row headerRow3 = sheet.createRow(rowIdx++);

            writeGroupedExcelHeaders(
                    sheet,
                    headerRow1,
                    headerRow2,
                    headerRow3,
                    headerRow1Idx,
                    headerRow2Idx,
                    headerRow3Idx,
                    styles.header,
                    report
            );
            sheet.setRepeatingRows(
                    new CellRangeAddress(headerRow1Idx, headerRow3Idx, 0, TOTAL_COLUMNS - 1)
            );

            int lastTableRow = headerRow3Idx;
            for (CadreReportRowResponse row : report.getRows()) {
                writeExcelDataRow(sheet.createRow(rowIdx), row, styles, false);
                lastTableRow = rowIdx;
                rowIdx++;
            }

            if (report.getTotals() != null) {
                writeExcelDataRow(sheet.createRow(rowIdx), report.getTotals(), styles, true);
                lastTableRow = rowIdx;
            }

            applyTableGrid(sheet, headerRow1Idx, lastTableRow);
            ReportSignatureBlock.addExcelRows(
                    sheet,
                    workbook,
                    lastTableRow,
                    5,
                    ReportSignatureBlock.DEFAULT_SYSTEM_NAME
            );

            workbook.write(out);
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to export Excel report", e);
        }
    }

    public byte[] exportPdf(CadreReportRequest request) {
        CadreReportResponse report = cadreReportService.generateReport(request);
        OrganizationSettingsResponse branding = organizationSettingsService.getSettings();

        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            com.lowagie.text.Rectangle pageSize = cadrePdfPageSize();
            Document document = new Document(
                    pageSize,
                    PDF_MARGIN_LEFT,
                    PDF_MARGIN_RIGHT,
                    PDF_MARGIN_TOP,
                    PDF_MARGIN_BOTTOM
            );
            PdfWriter writer = PdfWriter.getInstance(document, out);
            writer.setPageEvent(new PdfPageEventHelper() {
                @Override
                public void onEndPage(PdfWriter pdfWriter, Document pdfDocument) {
                    ColumnText.showTextAligned(
                            pdfWriter.getDirectContent(),
                            Element.ALIGN_CENTER,
                            new Phrase(
                                    String.valueOf(pdfWriter.getPageNumber()),
                                    FontFactory.getFont(FontFactory.HELVETICA, 11)
                            ),
                            pdfDocument.getPageSize().getWidth() / 2f,
                            48f,
                            0
                    );
                }
            });
            document.setPageSize(pageSize);
            document.open();

            PdfFonts fonts = createPdfFonts();
            addPdfTitleBlock(
                    document,
                    nvl(branding.getReportHeaderUppercase()),
                    fonts,
                    fromToLabel(report)
            );

            PdfPTable table = new PdfPTable(TOTAL_COLUMNS);
            table.setTotalWidth(pdfTableWidth());
            table.setLockedWidth(true);
            table.setWidths(PDF_COLUMN_WIDTHS);
            table.setHeaderRows(HEADER_ROW_COUNT);
            table.setSplitLate(false);
            table.setSplitRows(true);
            table.setSpacingBefore(0f);
            table.setSpacingAfter(0f);

            addPdfGroupedHeaders(table, fonts.header, report);

            for (CadreReportRowResponse row : report.getRows()) {
                addPdfRow(table, row, fonts, false);
            }

            if (report.getTotals() != null) {
                addPdfRow(table, report.getTotals(), fonts, true);
            }

            document.add(table);
            document.add(ReportSignatureBlock.pdfTable(
                    fonts.total,
                    fonts.body,
                    pdfTableWidth(),
                    PDF_COLUMN_WIDTHS[0]
                            + PDF_COLUMN_WIDTHS[1]
                            + PDF_COLUMN_WIDTHS[2]
                            + PDF_COLUMN_WIDTHS[3]
                            + PDF_COLUMN_WIDTHS[4],
                    ReportSignatureBlock.DEFAULT_SYSTEM_NAME
            ));
            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to export PDF report", e);
        }
    }

    private void writeGroupedExcelHeaders(
            Sheet sheet,
            org.apache.poi.ss.usermodel.Row headerRow1,
            org.apache.poi.ss.usermodel.Row headerRow2,
            org.apache.poi.ss.usermodel.Row headerRow3,
            int headerRow1Idx,
            int headerRow2Idx,
            int headerRow3Idx,
            CellStyle headerStyle,
            CadreReportResponse report
    ) {
        headerRow1.setHeightInPoints(36f);
        headerRow2.setHeightInPoints(32f);
        headerRow3.setHeightInPoints(30f);

        fillHeaderGrid(headerRow1, headerRow2, headerRow3, headerStyle);

        int col = 0;
        for (String label : PREFIX_HEADERS) {
            headerRow1.getCell(col).setCellValue(label);
            addMergedRegion(
                    sheet,
                    headerRow1Idx,
                    headerRow3Idx,
                    col,
                    col
            );
            col++;
        }

        headerRow1.getCell(col).setCellValue(employeesAtLabel(report));
        addMergedRegion(
                sheet,
                headerRow1Idx,
                headerRow3Idx,
                col,
                col
        );
        col++;

        int changesEndCol = col + CHANGES_SUB_HEADERS.length - 1;
        headerRow1.getCell(col).setCellValue(changesGroupLabel(report));
        addMergedRegion(
                sheet,
                headerRow1Idx,
                headerRow1Idx,
                col,
                changesEndCol
        );

        for (String subHeader : CHANGES_SUB_HEADERS) {
            headerRow2.getCell(col).setCellValue(subHeader);
            addMergedRegion(
                    sheet,
                    headerRow2Idx,
                    headerRow3Idx,
                    col,
                    col
            );
            col++;
        }

        int existingCadreStartCol = col;
        int existingCadreEndCol =
                existingCadreStartCol + EXISTING_CADRE_SUB_HEADERS.length - 1;
        headerRow1.getCell(existingCadreStartCol).setCellValue(particularsLabel(report));
        addMergedRegion(
                sheet,
                headerRow1Idx,
                headerRow1Idx,
                existingCadreStartCol,
                existingCadreEndCol
        );

        headerRow2.getCell(existingCadreStartCol).setCellValue("Existing cadre");
        addMergedRegion(
                sheet,
                headerRow2Idx,
                headerRow2Idx,
                existingCadreStartCol,
                existingCadreEndCol
        );

        col = existingCadreStartCol;
        for (String subHeader : EXISTING_CADRE_SUB_HEADERS) {
            headerRow3.getCell(col).setCellValue(subHeader);
            col++;
        }
    }

    private void fillHeaderGrid(
            org.apache.poi.ss.usermodel.Row headerRow1,
            org.apache.poi.ss.usermodel.Row headerRow2,
            org.apache.poi.ss.usermodel.Row headerRow3,
            CellStyle headerStyle
    ) {
        org.apache.poi.ss.usermodel.Row[] rows = {
                headerRow1,
                headerRow2,
                headerRow3
        };
        for (org.apache.poi.ss.usermodel.Row row : rows) {
            for (int col = 0; col < TOTAL_COLUMNS; col++) {
                Cell cell = row.getCell(col);
                if (cell == null) {
                    cell = row.createCell(col);
                }
                cell.setCellStyle(headerStyle);
            }
        }
    }

    private void addMergedRegion(
            Sheet sheet,
            int firstRow,
            int lastRow,
            int firstCol,
            int lastCol
    ) {
        if (firstRow == lastRow && firstCol == lastCol) {
            return;
        }
        sheet.addMergedRegion(new CellRangeAddress(
                firstRow,
                lastRow,
                firstCol,
                lastCol
        ));
    }

    private void addPdfGroupedHeaders(
            PdfPTable table,
            com.lowagie.text.Font headerFont,
            CadreReportResponse report
    ) {
        for (String label : PREFIX_HEADERS) {
            table.addCell(headerCell(label, headerFont, HEADER_ROW_COUNT, 1, 98f));
        }

        table.addCell(headerCell(
                employeesAtLabel(report),
                headerFont,
                HEADER_ROW_COUNT,
                1,
                98f
        ));
        table.addCell(headerCell(
                changesGroupLabel(report),
                headerFont,
                1,
                CHANGES_SUB_HEADERS.length,
                HEADER_ROW1_HEIGHT
        ));
        table.addCell(headerCell(
                particularsLabel(report),
                headerFont,
                1,
                EXISTING_CADRE_SUB_HEADERS.length,
                HEADER_ROW1_HEIGHT
        ));

        for (String label : CHANGES_SUB_HEADERS) {
            table.addCell(headerCell(
                    label,
                    headerFont,
                    2,
                    1,
                    HEADER_ROW2_HEIGHT + HEADER_ROW3_HEIGHT
            ));
        }

        table.addCell(headerCell(
                "Existing cadre",
                headerFont,
                1,
                EXISTING_CADRE_SUB_HEADERS.length,
                HEADER_ROW2_HEIGHT
        ));

        for (String label : EXISTING_CADRE_SUB_HEADERS) {
            table.addCell(headerCell(label, headerFont, 1, 1, HEADER_ROW3_HEIGHT));
        }
    }

    private PdfPCell headerCell(
            String text,
            com.lowagie.text.Font font,
            int rowSpan,
            int colSpan,
            float minHeight
    ) {
        PdfPCell cell = pdfCell(text, font, Element.ALIGN_CENTER, true);
        if (rowSpan > 1) {
            cell.setRowspan(rowSpan);
        }
        if (colSpan > 1) {
            cell.setColspan(colSpan);
        }
        cell.setMinimumHeight(minHeight);
        return cell;
    }

    private void writeExcelDataRow(
            org.apache.poi.ss.usermodel.Row excelRow,
            CadreReportRowResponse row,
            ExcelStyles styles,
            boolean totalRow
    ) {
        CellStyle numericStyle = totalRow ? styles.totalNumeric : styles.dataNumeric;
        CellStyle textStyle = totalRow ? styles.totalText : styles.dataText;
        CellStyle designationStyle =
                totalRow ? styles.totalDesignation : styles.dataDesignation;

        int col = 0;
        Cell serialCell = excelRow.createCell(col++);
        serialCell.setCellValue(
                row.getSerialNo() != null ? row.getSerialNo() : 0
        );
        serialCell.setCellStyle(numericStyle);

        Cell designation = excelRow.createCell(col++);
        designation.setCellValue(nvl(row.getDesignationName()));
        designation.setCellStyle(designationStyle);

        Cell service = excelRow.createCell(col++);
        service.setCellValue(nvl(row.getServiceCode()));
        service.setCellStyle(textStyle);

        Cell grade = excelRow.createCell(col++);
        grade.setCellValue(nvl(row.getGradeClassDisplay()));
        grade.setCellStyle(textStyle);

        Cell salary = excelRow.createCell(col++);
        salary.setCellValue(nvl(row.getSalaryCode()));
        salary.setCellStyle(textStyle);

        Cell serviceLevel = excelRow.createCell(col++);
        serviceLevel.setCellValue(nvl(row.getServiceLevelName()));
        serviceLevel.setCellStyle(textStyle);

        createNumericCell(excelRow, col++, row.getFinalApprovedCadre(), numericStyle);
        createNumericCell(excelRow, col++, row.getEmployeesAtStartDate(), numericStyle);
        createNumericCell(excelRow, col++, row.getTransferIn(), numericStyle);
        createNumericCell(excelRow, col++, row.getTransferOut(), numericStyle);
        createNumericCell(excelRow, col++, row.getRetiredResignation(), numericStyle);
        createNumericCell(excelRow, col++, row.getDeaths(), numericStyle);
        createNumericCell(excelRow, col++, row.getPromotionsIn(), numericStyle);
        createNumericCell(excelRow, col++, row.getNewAppointments(), numericStyle);
        createNumericCell(excelRow, col++, row.getDismissals(), numericStyle);
        createNumericCell(excelRow, col++, row.getVacationOfPost(), numericStyle);
        createNumericCell(excelRow, col++, row.getPermanent(), numericStyle);
        createNumericCell(excelRow, col++, row.getVacancies(), numericStyle);
        createNumericCell(excelRow, col++, row.getExcess(), numericStyle);
        createNumericCell(excelRow, col++, row.getCasual(), numericStyle);
        createNumericCell(excelRow, col++, row.getSubstitute(), numericStyle);
        createNumericCell(excelRow, col++, row.getContracts(), numericStyle);
        createNumericCell(excelRow, col, row.getTotalStaff(), numericStyle);
        excelRow.setHeightInPoints(dataRowHeight(row));
    }

    private float dataRowHeight(CadreReportRowResponse row) {
        int lines = 1;
        lines = Math.max(lines, wrappedLineCount(row.getDesignationName(), DESIGNATION_COL));
        lines = Math.max(lines, wrappedLineCount(row.getServiceCode(), SERVICE_COL));
        lines = Math.max(lines, wrappedLineCount(row.getGradeClassDisplay(), GRADE_COL));
        lines = Math.max(lines, wrappedLineCount(row.getSalaryCode(), SALARY_COL));
        lines = Math.max(lines, wrappedLineCount(row.getServiceLevelName(), SERVICE_LEVEL_COL));
        float height = DATA_ROW_PADDING_POINTS + (lines * DATA_ROW_LINE_HEIGHT_POINTS);
        return Math.max(DATA_ROW_MIN_HEIGHT_POINTS, height);
    }

    private int wrappedLineCount(String value, int columnIndex) {
        String text = nvl(value).trim();
        if (text.isEmpty()) {
            return 1;
        }
        int maxChars = Math.max(8, (COLUMN_WIDTHS[columnIndex] / 256) - 3);
        int lines = 0;
        for (String paragraph : text.split("\\R")) {
            lines += wrapParagraph(paragraph, maxChars);
        }
        return Math.max(1, lines);
    }

    private int wrapParagraph(String paragraph, int maxChars) {
        if (paragraph.isBlank()) {
            return 1;
        }
        int lines = 1;
        int used = 0;
        for (String word : paragraph.split("\\s+")) {
            if (word.length() > maxChars) {
                if (used > 0) {
                    lines++;
                    used = 0;
                }
                int remaining = word.length();
                while (remaining > maxChars) {
                    remaining -= maxChars;
                    lines++;
                }
                used = remaining;
                continue;
            }
            int extra = used == 0 ? word.length() : word.length() + 1;
            if (used + extra <= maxChars) {
                used += extra;
            } else {
                lines++;
                used = word.length();
            }
        }
        return lines;
    }

    private void configurePageSetup(Sheet sheet) {
        PrintSetup printSetup = sheet.getPrintSetup();
        printSetup.setLandscape(true);
        printSetup.setPaperSize(PrintSetup.A4_PAPERSIZE);
        printSetup.setFitWidth((short) 1);
        printSetup.setFitHeight((short) 0);

        sheet.setFitToPage(true);
        sheet.setHorizontallyCenter(true);
        sheet.setAutobreaks(true);
        sheet.setMargin(Sheet.LeftMargin, 0.3);
        sheet.setMargin(Sheet.RightMargin, 0.3);
        sheet.setMargin(Sheet.TopMargin, 0.5);
        sheet.setMargin(Sheet.BottomMargin, 0.5);
    }

    private void configureColumnWidths(Sheet sheet) {
        for (int i = 0; i < COLUMN_WIDTHS.length; i++) {
            sheet.setColumnWidth(i, COLUMN_WIDTHS[i]);
        }
    }

    private void createTitleRow(
            Sheet sheet,
            int rowIndex,
            String text,
            CellStyle style
    ) {
        org.apache.poi.ss.usermodel.Row row = sheet.createRow(rowIndex);
        if (rowIndex == 0) {
            row.setHeightInPoints(28f);
        } else if (rowIndex == 1) {
            row.setHeightInPoints(24f);
        } else {
            row.setHeightInPoints(20f);
        }
        Cell cell = row.createCell(0);
        cell.setCellValue(text);
        cell.setCellStyle(style);
        sheet.addMergedRegion(new CellRangeAddress(
                rowIndex,
                rowIndex,
                0,
                TOTAL_COLUMNS - 1
        ));
    }

    private ExcelStyles createExcelStyles(Workbook workbook) {
        org.apache.poi.ss.usermodel.Font titleFont = workbook.createFont();
        titleFont.setBold(true);
        titleFont.setFontName("Calibri");
        titleFont.setFontHeightInPoints((short) 16);

        org.apache.poi.ss.usermodel.Font subtitleFont = workbook.createFont();
        subtitleFont.setBold(true);
        subtitleFont.setFontName("Calibri");
        subtitleFont.setFontHeightInPoints((short) 12);

        org.apache.poi.ss.usermodel.Font metaFont = workbook.createFont();
        metaFont.setBold(true);
        metaFont.setFontName("Calibri");
        metaFont.setFontHeightInPoints((short) 11);

        org.apache.poi.ss.usermodel.Font headerFont = workbook.createFont();
        headerFont.setBold(true);
        headerFont.setFontName("Calibri");
        headerFont.setFontHeightInPoints((short) 10);

        org.apache.poi.ss.usermodel.Font bodyFont = workbook.createFont();
        bodyFont.setFontName("Calibri");
        bodyFont.setFontHeightInPoints((short) 10);

        org.apache.poi.ss.usermodel.Font totalFont = workbook.createFont();
        totalFont.setBold(true);
        totalFont.setFontName("Calibri");
        totalFont.setFontHeightInPoints((short) 10);

        CellStyle title = workbook.createCellStyle();
        title.setAlignment(HorizontalAlignment.CENTER);
        title.setVerticalAlignment(VerticalAlignment.CENTER);
        title.setFont(titleFont);

        CellStyle subtitle = workbook.createCellStyle();
        subtitle.setAlignment(HorizontalAlignment.CENTER);
        subtitle.setVerticalAlignment(VerticalAlignment.CENTER);
        subtitle.setFont(subtitleFont);

        CellStyle meta = workbook.createCellStyle();
        meta.setAlignment(HorizontalAlignment.CENTER);
        meta.setVerticalAlignment(VerticalAlignment.CENTER);
        meta.setFont(metaFont);

        CellStyle header = workbook.createCellStyle();
        header.setFont(headerFont);
        header.setAlignment(HorizontalAlignment.CENTER);
        header.setVerticalAlignment(VerticalAlignment.CENTER);
        header.setWrapText(true);
        header.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        header.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        applyThinBlackBorders(header);

        CellStyle dataText = workbook.createCellStyle();
        dataText.setFont(bodyFont);
        dataText.setAlignment(HorizontalAlignment.LEFT);
        dataText.setVerticalAlignment(VerticalAlignment.CENTER);
        dataText.setWrapText(true);
        applyThinBlackBorders(dataText);

        CellStyle dataDesignation = workbook.createCellStyle();
        dataDesignation.cloneStyleFrom(dataText);
        dataDesignation.setWrapText(true);
        dataDesignation.setIndention((short) 1);

        CellStyle dataNumeric = workbook.createCellStyle();
        dataNumeric.setFont(bodyFont);
        dataNumeric.setAlignment(HorizontalAlignment.CENTER);
        dataNumeric.setVerticalAlignment(VerticalAlignment.CENTER);
        applyThinBlackBorders(dataNumeric);

        CellStyle totalText = workbook.createCellStyle();
        totalText.cloneStyleFrom(dataText);
        totalText.setFont(totalFont);
        totalText.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        totalText.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        applyThinBlackBorders(totalText);

        CellStyle totalDesignation = workbook.createCellStyle();
        totalDesignation.cloneStyleFrom(totalText);
        totalDesignation.setWrapText(true);
        totalDesignation.setIndention((short) 1);

        CellStyle totalNumeric = workbook.createCellStyle();
        totalNumeric.cloneStyleFrom(dataNumeric);
        totalNumeric.setFont(totalFont);
        totalNumeric.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        totalNumeric.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        applyThinBlackBorders(totalNumeric);

        return new ExcelStyles(
                title,
                subtitle,
                meta,
                header,
                dataText,
                dataDesignation,
                dataNumeric,
                totalText,
                totalDesignation,
                totalNumeric
        );
    }

    private void applyThinBlackBorders(CellStyle style) {
        short black = IndexedColors.BLACK.getIndex();
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        style.setTopBorderColor(black);
        style.setBottomBorderColor(black);
        style.setLeftBorderColor(black);
        style.setRightBorderColor(black);
    }

    private void createNumericCell(
            org.apache.poi.ss.usermodel.Row row,
            int colIndex,
            long value,
            CellStyle style
    ) {
        Cell cell = row.createCell(colIndex);
        cell.setCellValue(value);
        cell.setCellStyle(style);
    }

    private void applyTableGrid(Sheet sheet, int headerFirstRow, int lastRow) {
        short black = IndexedColors.BLACK.getIndex();
        PropertyTemplate grid = new PropertyTemplate();
        grid.drawBorders(
                new CellRangeAddress(headerFirstRow, lastRow, 0, TOTAL_COLUMNS - 1),
                BorderStyle.THIN,
                black,
                BorderExtent.ALL
        );
        grid.applyBorders(sheet);
    }

    private record ExcelStyles(
            CellStyle title,
            CellStyle subtitle,
            CellStyle meta,
            CellStyle header,
            CellStyle dataText,
            CellStyle dataDesignation,
            CellStyle dataNumeric,
            CellStyle totalText,
            CellStyle totalDesignation,
            CellStyle totalNumeric
    ) {
    }

    private void addPdfRow(
            PdfPTable table,
            CadreReportRowResponse row,
            PdfFonts fonts,
            boolean totalRow
    ) {
        com.lowagie.text.Font font = totalRow ? fonts.total : fonts.body;
        table.addCell(pdfNumericCell(
                row.getSerialNo() != null ? row.getSerialNo().toString() : "",
                font,
                totalRow
        ));
        table.addCell(pdfDesignationCell(nvl(row.getDesignationName()), font, totalRow));
        table.addCell(pdfShortTextCell(nvl(row.getServiceCode()), font, totalRow));
        table.addCell(pdfShortTextCell(nvl(row.getGradeClassDisplay()), font, totalRow));
        table.addCell(pdfShortTextCell(nvl(row.getSalaryCode()), font, totalRow));
        table.addCell(pdfShortTextCell(nvl(row.getServiceLevelName()), font, totalRow));
        table.addCell(pdfNumericCell(String.valueOf(row.getFinalApprovedCadre()), font, totalRow));
        table.addCell(pdfNumericCell(String.valueOf(row.getEmployeesAtStartDate()), font, totalRow));
        table.addCell(pdfNumericCell(String.valueOf(row.getTransferIn()), font, totalRow));
        table.addCell(pdfNumericCell(String.valueOf(row.getTransferOut()), font, totalRow));
        table.addCell(pdfNumericCell(String.valueOf(row.getRetiredResignation()), font, totalRow));
        table.addCell(pdfNumericCell(String.valueOf(row.getDeaths()), font, totalRow));
        table.addCell(pdfNumericCell(String.valueOf(row.getPromotionsIn()), font, totalRow));
        table.addCell(pdfNumericCell(String.valueOf(row.getNewAppointments()), font, totalRow));
        table.addCell(pdfNumericCell(String.valueOf(row.getDismissals()), font, totalRow));
        table.addCell(pdfNumericCell(String.valueOf(row.getVacationOfPost()), font, totalRow));
        table.addCell(pdfNumericCell(String.valueOf(row.getPermanent()), font, totalRow));
        table.addCell(pdfNumericCell(String.valueOf(row.getVacancies()), font, totalRow));
        table.addCell(pdfNumericCell(String.valueOf(row.getExcess()), font, totalRow));
        table.addCell(pdfNumericCell(String.valueOf(row.getCasual()), font, totalRow));
        table.addCell(pdfNumericCell(String.valueOf(row.getSubstitute()), font, totalRow));
        table.addCell(pdfNumericCell(String.valueOf(row.getContracts()), font, totalRow));
        table.addCell(pdfNumericCell(String.valueOf(row.getTotalStaff()), font, totalRow));
    }

    private PdfPCell pdfDesignationCell(
            String text,
            com.lowagie.text.Font font,
            boolean totalRow
    ) {
        PdfPCell cell = pdfCell(text, font, Element.ALIGN_LEFT, totalRow);
        cell.setPaddingLeft(4f);
        cell.setPaddingRight(3f);
        cell.setNoWrap(false);
        cell.setMinimumHeight(pdfDataRowHeight(text));
        return cell;
    }

    private PdfPCell pdfShortTextCell(
            String text,
            com.lowagie.text.Font font,
            boolean totalRow
    ) {
        PdfPCell cell = pdfCell(text, font, Element.ALIGN_CENTER, totalRow);
        cell.setNoWrap(true);
        return cell;
    }

    private PdfPCell pdfNumericCell(
            String text,
            com.lowagie.text.Font font,
            boolean totalRow
    ) {
        PdfPCell cell = pdfCell(text, font, Element.ALIGN_CENTER, totalRow);
        cell.setNoWrap(true);
        return cell;
    }

    private PdfPCell pdfCell(
            String text,
            com.lowagie.text.Font font,
            int alignment,
            boolean shaded
    ) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setHorizontalAlignment(alignment);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        cell.setPaddingTop(2f);
        cell.setPaddingBottom(2f);
        cell.setPaddingLeft(alignment == Element.ALIGN_LEFT ? 3f : 1.5f);
        cell.setPaddingRight(1.5f);
        cell.setLeading(12f, 0f);
        cell.setUseAscender(false);
        cell.setUseDescender(false);
        cell.setBorderWidth(0.5f);
        cell.setBorderColor(java.awt.Color.BLACK);
        if (shaded) {
            cell.setBackgroundColor(HEADER_FILL);
        }
        return cell;
    }

    private float pdfDataRowHeight(String designation) {
        return wrappedLineCount(designation, DESIGNATION_COL) > 1
                ? PDF_WRAPPED_ROW_HEIGHT
                : PDF_DATA_ROW_HEIGHT;
    }

    private void addPdfTitleBlock(
            Document document,
            String header,
            PdfFonts fonts,
            String fromTo
    ) throws com.lowagie.text.DocumentException {
        PdfPTable titles = new PdfPTable(1);
        titles.setTotalWidth(pdfTableWidth());
        titles.setLockedWidth(true);
        titles.setSpacingBefore(0f);
        titles.setSpacingAfter(0f);
        titles.addCell(pdfTitleCell(header, fonts.title, TITLE_ROW_HEIGHT));
        titles.addCell(pdfTitleCell("CADRE REPORT", fonts.subtitle, SUBTITLE_ROW_HEIGHT));
        titles.addCell(pdfTitleCell(fromTo, fonts.meta, META_ROW_HEIGHT));
        PdfPCell gap = new PdfPCell(new Phrase(""));
        gap.setBorder(Rectangle.NO_BORDER);
        gap.setFixedHeight(TITLE_GAP_HEIGHT);
        titles.addCell(gap);
        document.add(titles);
    }

    private PdfPCell pdfTitleCell(
            String text,
            com.lowagie.text.Font font,
            float height
    ) {
        PdfPCell cell = new PdfPCell(new Phrase(nvl(text), font));
        cell.setBorder(Rectangle.NO_BORDER);
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        cell.setFixedHeight(height);
        cell.setPadding(0f);
        return cell;
    }

    private PdfFonts createPdfFonts() {
        return new PdfFonts(
                loadCarlitoFont(true, 16),
                loadCarlitoFont(true, 12),
                loadCarlitoFont(true, 11),
                loadCarlitoFont(true, 10),
                loadCarlitoFont(false, 10),
                loadCarlitoFont(true, 10)
        );
    }

    private com.lowagie.text.Font loadCarlitoFont(boolean bold, float size) {
        String resource = bold
                ? "/fonts/Carlito-Bold.ttf"
                : "/fonts/Carlito-Regular.ttf";
        try (InputStream in = CadreReportExportService.class.getResourceAsStream(resource)) {
            if (in == null) {
                return FontFactory.getFont(
                        bold ? FontFactory.HELVETICA_BOLD : FontFactory.HELVETICA,
                        size
                );
            }
            BaseFont baseFont = BaseFont.createFont(
                    resource,
                    BaseFont.IDENTITY_H,
                    BaseFont.EMBEDDED,
                    true,
                    in.readAllBytes(),
                    null
            );
            return new com.lowagie.text.Font(baseFont, size);
        } catch (Exception e) {
            return FontFactory.getFont(
                    bold ? FontFactory.HELVETICA_BOLD : FontFactory.HELVETICA,
                    size
            );
        }
    }

    private float pdfTableWidth() {
        float width = 0f;
        for (float column : PDF_COLUMN_WIDTHS) {
            width += column;
        }
        return width;
    }

    private String employeesAtLabel(CadreReportResponse report) {
        return "No of Employees as at " + DATE_FMT.format(report.getStartDate());
    }

    private String changesGroupLabel(CadreReportResponse report) {
        return "Changes Between "
                + DATE_FMT.format(report.getStartDate())
                + " to "
                + DATE_FMT.format(report.getEndDate());
    }

    private String particularsLabel(CadreReportResponse report) {
        return "Particulars as at " + DATE_FMT.format(report.getEndDate());
    }

    private String fromToLabel(CadreReportResponse report) {
        return "From: "
                + DATE_FMT.format(report.getStartDate())
                + "    To: "
                + DATE_FMT.format(report.getEndDate());
    }

    private String nvl(String value) {
        return value != null ? value : "";
    }

    private record PdfFonts(
            com.lowagie.text.Font title,
            com.lowagie.text.Font subtitle,
            com.lowagie.text.Font meta,
            com.lowagie.text.Font header,
            com.lowagie.text.Font body,
            com.lowagie.text.Font total
    ) {
    }
}
