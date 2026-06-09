package com.nwpengdep.hrms.service.report;

import com.lowagie.text.Chunk;
import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.nwpengdep.hrms.dto.CadreReportRequest;
import com.nwpengdep.hrms.dto.CadreReportResponse;
import com.nwpengdep.hrms.dto.CadreReportRowResponse;
import lombok.RequiredArgsConstructor;
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
import org.apache.poi.ss.util.RegionUtil;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import com.lowagie.text.FontFactory;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
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

    private final CadreReportService cadreReportService;

    public byte[] exportExcel(CadreReportRequest request) {
        CadreReportResponse report = cadreReportService.generateReport(request);

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
                    "NORTH WESTERN PROVINCIAL ENGINEERING DEPARTMENT",
                    styles.title
            );
            createTitleRow(sheet, rowIdx++, "CADRE REPORT", styles.subtitle);
            createTitleRow(
                    sheet,
                    rowIdx++,
                    "From: "
                            + DATE_FMT.format(report.getStartDate())
                            + "    To: "
                            + DATE_FMT.format(report.getEndDate()),
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

            for (CadreReportRowResponse row : report.getRows()) {
                writeExcelDataRow(sheet.createRow(rowIdx++), row, styles, false);
            }

            if (report.getTotals() != null) {
                org.apache.poi.ss.usermodel.Row totalRow = sheet.createRow(rowIdx);
                writeExcelDataRow(totalRow, report.getTotals(), styles, true);
            }

            applyOuterBorder(
                    sheet,
                    headerRow1Idx,
                    rowIdx,
                    0,
                    TOTAL_COLUMNS - 1
            );

            workbook.write(out);
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to export Excel report", e);
        }
    }

    public byte[] exportPdf(CadreReportRequest request) {
        CadreReportResponse report = cadreReportService.generateReport(request);

        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4.rotate(), 36, 36, 54, 36);
            PdfWriter.getInstance(document, out);
            document.open();

            com.lowagie.text.Font titleFont =
                    FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14);
            com.lowagie.text.Font metaFont =
                    FontFactory.getFont(FontFactory.HELVETICA, 10);
            com.lowagie.text.Font headerFont =
                    FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7);
            com.lowagie.text.Font cellFont =
                    FontFactory.getFont(FontFactory.HELVETICA, 7);

            document.add(new Paragraph(
                    "North Western Provincial Council — Engineering Department",
                    titleFont
            ));
            document.add(new Paragraph("Cadre Report", titleFont));
            document.add(new Paragraph(
                    "Period: "
                            + DATE_FMT.format(report.getStartDate())
                            + " to "
                            + DATE_FMT.format(report.getEndDate()),
                    metaFont
            ));
            document.add(new Paragraph(
                    "Generated: "
                            + report.getGeneratedAt().format(
                                    DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm")
                            ),
                    metaFont
            ));
            document.add(Chunk.NEWLINE);

            PdfPTable table = new PdfPTable(TOTAL_COLUMNS);
            table.setWidthPercentage(100);
            table.setHeaderRows(HEADER_ROW_COUNT);

            addPdfGroupedHeaders(table, headerFont, report);

            for (CadreReportRowResponse row : report.getRows()) {
                addPdfRow(table, row, cellFont);
            }

            if (report.getTotals() != null) {
                com.lowagie.text.Font totalFont =
                        FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7);
                addPdfRow(table, report.getTotals(), totalFont);
            }

            document.add(table);
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
        int col = 0;
        headerRow1.setHeightInPoints(34f);
        headerRow2.setHeightInPoints(30f);
        headerRow3.setHeightInPoints(28f);

        for (String label : PREFIX_HEADERS) {
            Cell cell = headerRow1.createCell(col);
            cell.setCellValue(label);
            cell.setCellStyle(headerStyle);
            sheet.addMergedRegion(new CellRangeAddress(
                    headerRow1Idx,
                    headerRow3Idx,
                    col,
                    col
            ));
            col++;
        }

        String employeesAtLabel =
                "No of Employees as at " + DATE_FMT.format(report.getStartDate());
        Cell employeesAtCell = headerRow1.createCell(col);
        employeesAtCell.setCellValue(employeesAtLabel);
        employeesAtCell.setCellStyle(headerStyle);
        sheet.addMergedRegion(new CellRangeAddress(
                headerRow1Idx,
                headerRow3Idx,
                col,
                col
        ));
        col++;

        String changesGroupLabel =
                "Changes Between "
                        + DATE_FMT.format(report.getStartDate())
                        + " to "
                        + DATE_FMT.format(report.getEndDate());
        Cell changesGroupCell = headerRow1.createCell(col);
        changesGroupCell.setCellValue(changesGroupLabel);
        changesGroupCell.setCellStyle(headerStyle);
        int changesEndCol = col + CHANGES_SUB_HEADERS.length - 1;
        sheet.addMergedRegion(new CellRangeAddress(
                headerRow1Idx,
                headerRow1Idx,
                col,
                changesEndCol
        ));

        int changesColStart = col;
        for (String subHeader : CHANGES_SUB_HEADERS) {
            Cell subCell = headerRow2.createCell(col);
            subCell.setCellValue(subHeader);
            subCell.setCellStyle(headerStyle);
            col++;
        }

        String particularsLabel =
                "Particulars as at " + DATE_FMT.format(report.getEndDate());
        int existingCadreStartCol = col;
        Cell particularsCell = headerRow1.createCell(existingCadreStartCol);
        particularsCell.setCellValue(particularsLabel);
        particularsCell.setCellStyle(headerStyle);
        int existingCadreEndCol =
                existingCadreStartCol + EXISTING_CADRE_SUB_HEADERS.length - 1;
        sheet.addMergedRegion(new CellRangeAddress(
                headerRow1Idx,
                headerRow1Idx,
                existingCadreStartCol,
                existingCadreEndCol
        ));

        Cell existingCadreCell = headerRow2.createCell(existingCadreStartCol);
        existingCadreCell.setCellValue("Existing cadre");
        existingCadreCell.setCellStyle(headerStyle);
        sheet.addMergedRegion(new CellRangeAddress(
                headerRow2Idx,
                headerRow2Idx,
                existingCadreStartCol,
                existingCadreEndCol
        ));

        col = existingCadreStartCol;
        for (String subHeader : EXISTING_CADRE_SUB_HEADERS) {
            Cell subCell = headerRow3.createCell(col);
            subCell.setCellValue(subHeader);
            subCell.setCellStyle(headerStyle);
            col++;
        }

        // Changes columns only occupy rows 1–2; row 3 has no cells there.
        for (int changeCol = changesColStart; changeCol < changesColStart + CHANGES_SUB_HEADERS.length; changeCol++) {
            sheet.addMergedRegion(new CellRangeAddress(
                    headerRow2Idx,
                    headerRow3Idx,
                    changeCol,
                    changeCol
            ));
        }
    }

    private void addPdfGroupedHeaders(
            PdfPTable table,
            com.lowagie.text.Font headerFont,
            CadreReportResponse report
    ) {
        String employeesAtLabel =
                "No of Employees as at " + DATE_FMT.format(report.getStartDate());
        String changesGroupLabel =
                "Changes Between "
                        + DATE_FMT.format(report.getStartDate())
                        + " to "
                        + DATE_FMT.format(report.getEndDate());
        String particularsLabel =
                "Particulars as at " + DATE_FMT.format(report.getEndDate());

        for (String label : PREFIX_HEADERS) {
            table.addCell(headerCell(label, headerFont, HEADER_ROW_COUNT, 1));
        }

        table.addCell(headerCell(employeesAtLabel, headerFont, HEADER_ROW_COUNT, 1));
        table.addCell(headerCell(changesGroupLabel, headerFont, 1, CHANGES_SUB_HEADERS.length));
        table.addCell(headerCell(
                particularsLabel,
                headerFont,
                1,
                EXISTING_CADRE_SUB_HEADERS.length
        ));

        for (String label : CHANGES_SUB_HEADERS) {
            table.addCell(headerCell(label, headerFont, 2, 1));
        }

        table.addCell(headerCell(
                "Existing cadre",
                headerFont,
                1,
                EXISTING_CADRE_SUB_HEADERS.length
        ));

        for (String label : EXISTING_CADRE_SUB_HEADERS) {
            table.addCell(headerCell(label, headerFont, 1, 1));
        }
    }

    private PdfPCell headerCell(
            String text,
            com.lowagie.text.Font font,
            int rowSpan,
            int colSpan
    ) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        cell.setBackgroundColor(new java.awt.Color(220, 220, 220));
        if (rowSpan > 1) {
            cell.setRowspan(rowSpan);
        }
        if (colSpan > 1) {
            cell.setColspan(colSpan);
        }
        return cell;
    }

    private void writeExcelDataRow(
            org.apache.poi.ss.usermodel.Row excelRow,
            CadreReportRowResponse row,
            ExcelStyles styles,
            boolean totalRow
    ) {
        excelRow.setHeightInPoints(21f);
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
        int[] widths = {
                1600, 9000, 2800, 3400, 3200, 3600, 3400, 3700,
                2800, 2800, 3200, 2600, 2800, 3400, 2800, 3400,
                2600, 2600, 2600, 2600, 2900, 2900, 4100
        };
        for (int i = 0; i < widths.length; i++) {
            sheet.setColumnWidth(i, widths[i]);
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
        applyBorders(header, BorderStyle.MEDIUM, BorderStyle.MEDIUM);

        CellStyle dataText = workbook.createCellStyle();
        dataText.setFont(bodyFont);
        dataText.setAlignment(HorizontalAlignment.LEFT);
        dataText.setVerticalAlignment(VerticalAlignment.CENTER);
        dataText.setWrapText(true);
        applyBorders(dataText, BorderStyle.THIN, BorderStyle.THIN);

        CellStyle dataDesignation = workbook.createCellStyle();
        dataDesignation.cloneStyleFrom(dataText);
        dataDesignation.setWrapText(true);

        CellStyle dataNumeric = workbook.createCellStyle();
        dataNumeric.setFont(bodyFont);
        dataNumeric.setAlignment(HorizontalAlignment.CENTER);
        dataNumeric.setVerticalAlignment(VerticalAlignment.CENTER);
        applyBorders(dataNumeric, BorderStyle.THIN, BorderStyle.THIN);

        CellStyle totalText = workbook.createCellStyle();
        totalText.cloneStyleFrom(dataText);
        totalText.setFont(totalFont);
        totalText.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        totalText.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        totalText.setBorderTop(BorderStyle.MEDIUM);

        CellStyle totalDesignation = workbook.createCellStyle();
        totalDesignation.cloneStyleFrom(totalText);
        totalDesignation.setWrapText(true);

        CellStyle totalNumeric = workbook.createCellStyle();
        totalNumeric.cloneStyleFrom(dataNumeric);
        totalNumeric.setFont(totalFont);
        totalNumeric.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        totalNumeric.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        totalNumeric.setBorderTop(BorderStyle.MEDIUM);

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

    private void applyBorders(
            CellStyle style,
            BorderStyle border,
            BorderStyle borderBetween
    ) {
        style.setBorderTop(border);
        style.setBorderBottom(border);
        style.setBorderLeft(borderBetween);
        style.setBorderRight(borderBetween);
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

    private void applyOuterBorder(
            Sheet sheet,
            int firstRow,
            int lastRow,
            int firstCol,
            int lastCol
    ) {
        CellRangeAddress range = new CellRangeAddress(firstRow, lastRow, firstCol, lastCol);
        RegionUtil.setBorderTop(BorderStyle.MEDIUM, range, sheet);
        RegionUtil.setBorderBottom(BorderStyle.MEDIUM, range, sheet);
        RegionUtil.setBorderLeft(BorderStyle.MEDIUM, range, sheet);
        RegionUtil.setBorderRight(BorderStyle.MEDIUM, range, sheet);
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
            com.lowagie.text.Font font
    ) {
        table.addCell(cell(row.getSerialNo() != null ? row.getSerialNo().toString() : "", font));
        table.addCell(cell(nvl(row.getDesignationName()), font));
        table.addCell(cell(nvl(row.getServiceCode()), font));
        table.addCell(cell(nvl(row.getGradeClassDisplay()), font));
        table.addCell(cell(nvl(row.getSalaryCode()), font));
        table.addCell(cell(nvl(row.getServiceLevelName()), font));
        table.addCell(cell(String.valueOf(row.getFinalApprovedCadre()), font));
        table.addCell(cell(String.valueOf(row.getEmployeesAtStartDate()), font));
        table.addCell(cell(String.valueOf(row.getTransferIn()), font));
        table.addCell(cell(String.valueOf(row.getTransferOut()), font));
        table.addCell(cell(String.valueOf(row.getRetiredResignation()), font));
        table.addCell(cell(String.valueOf(row.getDeaths()), font));
        table.addCell(cell(String.valueOf(row.getPromotionsIn()), font));
        table.addCell(cell(String.valueOf(row.getNewAppointments()), font));
        table.addCell(cell(String.valueOf(row.getDismissals()), font));
        table.addCell(cell(String.valueOf(row.getVacationOfPost()), font));
        table.addCell(cell(String.valueOf(row.getPermanent()), font));
        table.addCell(cell(String.valueOf(row.getVacancies()), font));
        table.addCell(cell(String.valueOf(row.getExcess()), font));
        table.addCell(cell(String.valueOf(row.getCasual()), font));
        table.addCell(cell(String.valueOf(row.getSubstitute()), font));
        table.addCell(cell(String.valueOf(row.getContracts()), font));
        table.addCell(cell(String.valueOf(row.getTotalStaff()), font));
    }

    private PdfPCell cell(String text, com.lowagie.text.Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);
        return cell;
    }

    private String nvl(String value) {
        return value != null ? value : "";
    }
}
