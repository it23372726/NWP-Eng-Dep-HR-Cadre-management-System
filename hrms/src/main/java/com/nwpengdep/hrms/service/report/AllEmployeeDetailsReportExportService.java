package com.nwpengdep.hrms.service.report;

import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.BaseFont;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.nwpengdep.hrms.dto.AllEmployeeDetailsReportResponse;
import com.nwpengdep.hrms.dto.AllEmployeeDetailsReportRowResponse;
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
import com.lowagie.text.FontFactory;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AllEmployeeDetailsReportExportService {

    private static final DateTimeFormatter DATE_FMT =
            DateTimeFormatter.ofPattern("dd-MM-yyyy");

    private static final String[] COLUMN_HEADERS = {
            "S/N",
            "Name of the Employee",
            "Designation",
            "NIC No",
            "Date of Birth",
            "Gender",
            "Service Category",
            "Service",
            "Salary Code",
            "Grade",
            "Nature of Appointment",
            "Date of First Appointment",
            "Increment Date",
            "Entered Date to All Island Service",
            "Reported Date to Present Working Place",
            "Current Working Place",
            "Current District of Working",
            "Appointment Date to Present Class/Grade",
            "Entered Date to the N.W.P. Council",
            "Permanent Address",
            "Resident District",
            "Contact No"
    };

    private static final int[] COLUMN_WIDTHS = {
            1600, 9000, 6000, 3000, 3000, 2000, 3000, 6000,
            2500, 2500, 4000, 4000, 2500, 4000, 4000, 6000, 3500,
            4000, 4000, 8000, 3000, 3000
    };

    private static final int TOTAL_COLUMNS = COLUMN_HEADERS.length;

    private static final float EXCEL_DATA_ROW_MIN_HEIGHT = 21f;
    private static final float EXCEL_DATA_LINE_HEIGHT = 15f;
    private static final float EXCEL_DATA_PADDING = 6f;

    /**
     * Matches the Excel Save-as-PDF coordinate system used by the report exports.
     * The wider employee sheet is scaled to the same A4-landscape page width.
     */
    private static final float PDF_PAGE_WIDTH = 1871.111f;
    private static final float PDF_PAGE_HEIGHT = 1322.222f;
    private static final float PDF_MARGIN_LEFT = 48f;
    private static final float PDF_MARGIN_RIGHT = 66.111f;
    private static final float PDF_MARGIN_TOP = 89f;
    private static final float PDF_MARGIN_BOTTOM = 48f;
    private static final float PDF_TABLE_WIDTH =
            PDF_PAGE_WIDTH - PDF_MARGIN_LEFT - PDF_MARGIN_RIGHT;
    private static final float PDF_EXCEL_SCALE = 0.846f;
    private static final float PDF_TITLE_HEIGHT = 28f * PDF_EXCEL_SCALE;
    private static final float PDF_SUBTITLE_HEIGHT = 24f * PDF_EXCEL_SCALE;
    private static final float PDF_META_HEIGHT = 20f * PDF_EXCEL_SCALE;
    private static final float PDF_TITLE_GAP = 13.57f * PDF_EXCEL_SCALE;
    private static final float PDF_HEADER_MIN_HEIGHT = 48f * PDF_EXCEL_SCALE;
    private static final float PDF_DATA_MIN_HEIGHT =
            EXCEL_DATA_ROW_MIN_HEIGHT * PDF_EXCEL_SCALE;
    private static final java.awt.Color HEADER_FILL =
            new java.awt.Color(192, 192, 192);

    private static final String DEFAULT_REPORT_TITLE = "ALL EMPLOYEE DETAILS REPORT";

    private final AllEmployeeDetailsReportService allEmployeeDetailsReportService;
    private final OrganizationSettingsService organizationSettingsService;

    public byte[] exportExcel() {
        return exportExcel(allEmployeeDetailsReportService.generateReport());
    }

    public byte[] exportExcel(AllEmployeeDetailsReportResponse report) {
        AllEmployeeDetailsReportResponse exportReport = normalizeReport(report);
        OrganizationSettingsResponse branding = organizationSettingsService.getSettings();

        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            Sheet sheet = workbook.createSheet("All Employee Details");
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
            createTitleRow(sheet, rowIdx++, resolveReportTitle(exportReport), styles.subtitle);
            createTitleRow(
                    sheet,
                    rowIdx++,
                    "Total Employees: " + exportReport.getTotalCount(),
                    styles.meta
            );
            createTitleRow(
                    sheet,
                    rowIdx++,
                    "Generated: " + exportReport.getGeneratedAt().format(DATE_FMT),
                    styles.meta
            );
            rowIdx++;

            int headerRowIdx = rowIdx;
            org.apache.poi.ss.usermodel.Row headerRow = sheet.createRow(rowIdx++);
            writeExcelHeader(headerRow, styles.header);
            sheet.setRepeatingRows(
                    new CellRangeAddress(headerRowIdx, headerRowIdx, 0, TOTAL_COLUMNS - 1)
            );

            int lastTableRow = headerRowIdx;
            for (AllEmployeeDetailsReportRowResponse row : exportReport.getRows()) {
                writeExcelDataRow(sheet.createRow(rowIdx++), row, styles);
                lastTableRow = rowIdx - 1;
            }

            applyTableGrid(sheet, headerRowIdx, lastTableRow);
            ReportSignatureBlock.addExcelRows(sheet, workbook, lastTableRow, 5);

            workbook.write(out);
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to export Excel report", e);
        }
    }

    public byte[] exportPdf() {
        return exportPdf(allEmployeeDetailsReportService.generateReport());
    }

    public byte[] exportPdf(AllEmployeeDetailsReportResponse report) {
        AllEmployeeDetailsReportResponse exportReport = normalizeReport(report);
        OrganizationSettingsResponse branding = organizationSettingsService.getSettings();

        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document(
                    new Rectangle(PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT),
                    PDF_MARGIN_LEFT,
                    PDF_MARGIN_RIGHT,
                    PDF_MARGIN_TOP,
                    PDF_MARGIN_BOTTOM
            );
            PdfWriter.getInstance(document, out);
            document.open();

            PdfFonts fonts = createPdfFonts();
            addPdfTitleBlock(document, exportReport, branding, fonts);

            float[] pdfColumnWidths = createPdfColumnWidths();
            PdfPTable table = new PdfPTable(TOTAL_COLUMNS);
            table.setTotalWidth(PDF_TABLE_WIDTH);
            table.setLockedWidth(true);
            table.setWidths(pdfColumnWidths);
            table.setHeaderRows(1);
            table.setSplitLate(false);
            table.setSplitRows(true);
            table.setSpacingBefore(0f);
            table.setSpacingAfter(0f);

            for (String header : COLUMN_HEADERS) {
                table.addCell(headerCell(header, fonts.header));
            }

            for (AllEmployeeDetailsReportRowResponse row : exportReport.getRows()) {
                addPdfRow(table, row, fonts.body);
            }

            document.add(table);
            document.add(ReportSignatureBlock.pdfTable(
                    fonts.signature,
                    PDF_TABLE_WIDTH,
                    sumWidths(pdfColumnWidths, 0, 5)
            ));
            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to export PDF report", e);
        }
    }

    private AllEmployeeDetailsReportResponse normalizeReport(
            AllEmployeeDetailsReportResponse report
    ) {
        if (report == null) {
            return allEmployeeDetailsReportService.generateReport();
        }

        List<AllEmployeeDetailsReportRowResponse> rows =
                report.getRows() != null ? report.getRows() : List.of();

        return AllEmployeeDetailsReportResponse.builder()
                .generatedAt(
                        report.getGeneratedAt() != null
                                ? report.getGeneratedAt()
                                : LocalDateTime.now()
                )
                .totalCount(rows.size())
                .reportTitle(resolveReportTitle(report))
                .rows(rows)
                .build();
    }

    private String resolveReportTitle(AllEmployeeDetailsReportResponse report) {
        if (report == null || report.getReportTitle() == null
                || report.getReportTitle().isBlank()) {
            return DEFAULT_REPORT_TITLE;
        }
        return report.getReportTitle().trim();
    }

    private PdfPCell headerCell(
            String text,
            com.lowagie.text.Font font
    ) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        cell.setBackgroundColor(HEADER_FILL);
        cell.setBorderColor(java.awt.Color.BLACK);
        cell.setBorderWidth(0.5f);
        cell.setPaddingTop(2f);
        cell.setPaddingBottom(2f);
        cell.setPaddingLeft(1.5f);
        cell.setPaddingRight(1.5f);
        cell.setLeading(10f * PDF_EXCEL_SCALE, 0f);
        cell.setMinimumHeight(PDF_HEADER_MIN_HEIGHT);
        cell.setNoWrap(false);
        return cell;
    }

    private void writeExcelHeader(
            org.apache.poi.ss.usermodel.Row headerRow,
            CellStyle headerStyle
    ) {
        headerRow.setHeightInPoints(48f);
        for (int i = 0; i < COLUMN_HEADERS.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(COLUMN_HEADERS[i]);
            cell.setCellStyle(headerStyle);
        }
    }

    private void writeExcelDataRow(
            org.apache.poi.ss.usermodel.Row excelRow,
            AllEmployeeDetailsReportRowResponse row,
            ExcelStyles styles
    ) {
        String[] values = rowValues(row);
        excelRow.setHeightInPoints(excelRowHeight(values));

        for (int col = 0; col < values.length; col++) {
            createTextCell(
                    excelRow,
                    col,
                    values[col],
                    col == 0 ? styles.dataNumeric : styles.dataText
            );
        }
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
            String[] lines = text.split("\\R", -1);
            int wrappedExtra = 0;
            for (String line : lines) {
                int approxCharsPerLine = 110;
                wrappedExtra += Math.max(0,
                        (line.length() + approxCharsPerLine - 1) / approxCharsPerLine - 1);
            }
            int totalLines = Math.max(1, lines.length + wrappedExtra);
            row.setHeightInPoints(Math.max(24f, totalLines * 16f));
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
                COLUMN_HEADERS.length - 1
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

        CellStyle title = workbook.createCellStyle();
        title.setAlignment(HorizontalAlignment.CENTER);
        title.setVerticalAlignment(VerticalAlignment.CENTER);
        title.setFont(titleFont);

        CellStyle subtitle = workbook.createCellStyle();
        subtitle.setAlignment(HorizontalAlignment.CENTER);
        subtitle.setVerticalAlignment(VerticalAlignment.CENTER);
        subtitle.setWrapText(true);
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

        CellStyle dataNumeric = workbook.createCellStyle();
        dataNumeric.setFont(bodyFont);
        dataNumeric.setAlignment(HorizontalAlignment.CENTER);
        dataNumeric.setVerticalAlignment(VerticalAlignment.CENTER);
        applyThinBlackBorders(dataNumeric);

        return new ExcelStyles(
                title,
                subtitle,
                meta,
                header,
                dataText,
                dataNumeric
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

    private void createTextCell(
            org.apache.poi.ss.usermodel.Row row,
            int colIndex,
            String value,
            CellStyle style
    ) {
        Cell cell = row.createCell(colIndex);
        cell.setCellValue(value);
        cell.setCellStyle(style);
    }

    private void applyTableGrid(Sheet sheet, int headerRow, int lastRow) {
        PropertyTemplate grid = new PropertyTemplate();
        grid.drawBorders(
                new CellRangeAddress(headerRow, lastRow, 0, TOTAL_COLUMNS - 1),
                BorderStyle.THIN,
                IndexedColors.BLACK.getIndex(),
                BorderExtent.ALL
        );
        grid.applyBorders(sheet);
    }

    private String[] rowValues(AllEmployeeDetailsReportRowResponse row) {
        return new String[]{
                row.getSerialNo() != null ? row.getSerialNo().toString() : "",
                nvl(row.getEmployeeName()),
                nvl(row.getDesignation()),
                nvl(row.getNic()),
                formatDate(row.getDateOfBirth()),
                nvl(row.getGender()),
                nvl(row.getServiceCategory()),
                nvl(row.getService()),
                nvl(row.getSalaryCode()),
                nvl(row.getGrade()),
                nvl(row.getNatureOfAppointment()),
                formatDate(row.getDateOfFirstAppointment()),
                nvl(row.getIncremantDate()),
                formatDate(row.getEnteredDateToAllIslandService()),
                formatDate(row.getReportedDateToPresentWorkingPlace()),
                nvl(row.getCurrentWorkingPlace()),
                nvl(row.getCurrentDistrictOfWorking()),
                formatDate(row.getAppointmentDateToPresentClassGrade()),
                formatDate(row.getEnteredDateToNWPCouncil()),
                nvl(row.getPermanentAddress()),
                nvl(row.getResidentDistrict()),
                nvl(row.getContactNo())
        };
    }

    private float excelRowHeight(String[] values) {
        int maxLines = 1;
        for (int col = 1; col < values.length; col++) {
            int availableChars = Math.max(4, COLUMN_WIDTHS[col] / 256 - 1);
            maxLines = Math.max(
                    maxLines,
                    wrappedLineCount(values[col], availableChars)
            );
        }
        return Math.max(
                EXCEL_DATA_ROW_MIN_HEIGHT,
                maxLines * EXCEL_DATA_LINE_HEIGHT + EXCEL_DATA_PADDING
        );
    }

    private int wrappedLineCount(String value, int maxChars) {
        if (value == null || value.isBlank()) {
            return 1;
        }

        int lines = 1;
        int used = 0;
        for (String word : value.trim().split("\\s+")) {
            if (word.length() > maxChars) {
                if (used > 0) {
                    lines++;
                }
                lines += (word.length() - 1) / maxChars;
                used = word.length() % maxChars;
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

    private record ExcelStyles(
            CellStyle title,
            CellStyle subtitle,
            CellStyle meta,
            CellStyle header,
            CellStyle dataText,
            CellStyle dataNumeric
    ) {
    }

    private void addPdfRow(
            PdfPTable table,
            AllEmployeeDetailsReportRowResponse row,
            com.lowagie.text.Font font
    ) {
        String[] values = rowValues(row);
        for (int col = 0; col < values.length; col++) {
            table.addCell(bodyCell(
                    values[col],
                    font,
                    col == 0 ? Element.ALIGN_CENTER : Element.ALIGN_LEFT
            ));
        }
    }

    private PdfPCell bodyCell(
            String text,
            com.lowagie.text.Font font,
            int alignment
    ) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setHorizontalAlignment(alignment);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        cell.setBorderColor(java.awt.Color.BLACK);
        cell.setBorderWidth(0.5f);
        cell.setPaddingTop(2f * PDF_EXCEL_SCALE);
        cell.setPaddingBottom(2f * PDF_EXCEL_SCALE);
        cell.setPaddingLeft(alignment == Element.ALIGN_LEFT ? 3f : 1.5f);
        cell.setPaddingRight(1.5f);
        cell.setLeading(12f * PDF_EXCEL_SCALE, 0f);
        cell.setMinimumHeight(PDF_DATA_MIN_HEIGHT);
        cell.setNoWrap(false);
        return cell;
    }

    private void addPdfTitleBlock(
            Document document,
            AllEmployeeDetailsReportResponse report,
            OrganizationSettingsResponse branding,
            PdfFonts fonts
    ) throws com.lowagie.text.DocumentException {
        PdfPTable titles = new PdfPTable(1);
        titles.setTotalWidth(PDF_TABLE_WIDTH);
        titles.setLockedWidth(true);
        titles.setSpacingBefore(0f);
        titles.setSpacingAfter(0f);
        titles.addCell(pdfTitleCell(
                nvl(branding.getReportHeaderUppercase()),
                fonts.title,
                PDF_TITLE_HEIGHT
        ));
        titles.addCell(pdfWrappedTitleCell(
                resolveReportTitle(report),
                fonts.subtitle,
                PDF_SUBTITLE_HEIGHT
        ));
        titles.addCell(pdfTitleCell(
                "Total Employees: " + report.getTotalCount(),
                fonts.meta,
                PDF_META_HEIGHT
        ));
        titles.addCell(pdfTitleCell(
                "Generated: " + report.getGeneratedAt().format(DATE_FMT),
                fonts.meta,
                PDF_META_HEIGHT
        ));

        PdfPCell gap = new PdfPCell(new Phrase(""));
        gap.setBorder(Rectangle.NO_BORDER);
        gap.setFixedHeight(PDF_TITLE_GAP);
        titles.addCell(gap);
        document.add(titles);
    }

    private PdfPCell pdfTitleCell(
            String text,
            com.lowagie.text.Font font,
            float height
    ) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setBorder(Rectangle.NO_BORDER);
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        cell.setFixedHeight(height);
        cell.setPadding(0f);
        return cell;
    }

    private PdfPCell pdfWrappedTitleCell(
            String text,
            com.lowagie.text.Font font,
            float minHeight
    ) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setBorder(Rectangle.NO_BORDER);
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        cell.setMinimumHeight(minHeight);
        cell.setNoWrap(false);
        cell.setPaddingTop(2f);
        cell.setPaddingBottom(2f);
        cell.setPaddingLeft(4f);
        cell.setPaddingRight(4f);
        return cell;
    }

    private PdfFonts createPdfFonts() {
        return new PdfFonts(
                loadCarlitoFont(true, 16f * PDF_EXCEL_SCALE),
                loadCarlitoFont(true, 12f * PDF_EXCEL_SCALE),
                loadCarlitoFont(true, 11f * PDF_EXCEL_SCALE),
                loadCarlitoFont(true, 10f * PDF_EXCEL_SCALE),
                loadCarlitoFont(false, 10f * PDF_EXCEL_SCALE),
                loadCarlitoFont(true, 10f * PDF_EXCEL_SCALE)
        );
    }

    private com.lowagie.text.Font loadCarlitoFont(boolean bold, float size) {
        String resource = bold
                ? "/fonts/Carlito-Bold.ttf"
                : "/fonts/Carlito-Regular.ttf";
        try (InputStream in =
                     AllEmployeeDetailsReportExportService.class.getResourceAsStream(resource)) {
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

    private float[] createPdfColumnWidths() {
        float totalExcelWidth = 0f;
        for (int width : COLUMN_WIDTHS) {
            totalExcelWidth += width;
        }

        float[] widths = new float[COLUMN_WIDTHS.length];
        for (int i = 0; i < COLUMN_WIDTHS.length; i++) {
            widths[i] = PDF_TABLE_WIDTH * COLUMN_WIDTHS[i] / totalExcelWidth;
        }
        return widths;
    }

    private float sumWidths(float[] widths, int startInclusive, int endExclusive) {
        float sum = 0f;
        for (int i = startInclusive; i < endExclusive; i++) {
            sum += widths[i];
        }
        return sum;
    }

    private record PdfFonts(
            com.lowagie.text.Font title,
            com.lowagie.text.Font subtitle,
            com.lowagie.text.Font meta,
            com.lowagie.text.Font header,
            com.lowagie.text.Font body,
            com.lowagie.text.Font signature
    ) {
    }

    private String nvl(String value) {
        return value != null ? value : "";
    }

    private String formatDate(java.time.LocalDate date) {
        if (date == null) {
            return "";
        }
        return date.format(DATE_FMT);
    }
}
