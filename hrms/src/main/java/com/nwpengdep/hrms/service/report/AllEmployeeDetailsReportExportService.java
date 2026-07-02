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
import com.nwpengdep.hrms.dto.AllEmployeeDetailsReportResponse;
import com.nwpengdep.hrms.dto.AllEmployeeDetailsReportRowResponse;
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
            "Incremant Date",
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

    private final AllEmployeeDetailsReportService allEmployeeDetailsReportService;

    public byte[] exportExcel() {
        AllEmployeeDetailsReportResponse report = allEmployeeDetailsReportService.generateReport();

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
                    "NORTH WESTERN PROVINCIAL ENGINEERING DEPARTMENT",
                    styles.title
            );
            createTitleRow(sheet, rowIdx++, "ALL EMPLOYEE DETAILS REPORT", styles.subtitle);
            createTitleRow(
                    sheet,
                    rowIdx++,
                    "Total Employees: " + report.getTotalCount(),
                    styles.meta
            );
            createTitleRow(
                    sheet,
                    rowIdx++,
                    "Generated: " + report.getGeneratedAt().format(DATE_FMT),
                    styles.meta
            );
            rowIdx++;

            org.apache.poi.ss.usermodel.Row headerRow = sheet.createRow(rowIdx++);
            writeExcelHeader(headerRow, styles.header);

            for (AllEmployeeDetailsReportRowResponse row : report.getRows()) {
                writeExcelDataRow(sheet.createRow(rowIdx++), row, styles);
            }

            applyOuterBorder(
                    sheet,
                    rowIdx - report.getRows().size() - 1,
                    rowIdx - 1,
                    0,
                    COLUMN_HEADERS.length - 1
            );

            workbook.write(out);
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to export Excel report", e);
        }
    }

    public byte[] exportPdf() {
        AllEmployeeDetailsReportResponse report = allEmployeeDetailsReportService.generateReport();

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
            document.add(new Paragraph("All Employee Details Report", titleFont));
            document.add(new Paragraph(
                    "Total Employees: " + report.getTotalCount(),
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

            PdfPTable table = new PdfPTable(COLUMN_HEADERS.length);
            table.setWidthPercentage(100);
            table.setHeaderRows(1);

            for (String header : COLUMN_HEADERS) {
                table.addCell(headerCell(header, headerFont, 1, 1));
            }

            for (AllEmployeeDetailsReportRowResponse row : report.getRows()) {
                addPdfRow(table, row, cellFont);
            }

            document.add(table);
            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to export PDF report", e);
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

    private void writeExcelHeader(
            org.apache.poi.ss.usermodel.Row headerRow,
            CellStyle headerStyle
    ) {
        headerRow.setHeightInPoints(28f);
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
        excelRow.setHeightInPoints(21f);

        int col = 0;
        createTextCell(excelRow, col++, row.getSerialNo() != null ? row.getSerialNo().toString() : "", styles.dataNumeric);
        createTextCell(excelRow, col++, nvl(row.getEmployeeName()), styles.dataText);
        createTextCell(excelRow, col++, nvl(row.getDesignation()), styles.dataText);
        createTextCell(excelRow, col++, nvl(row.getNic()), styles.dataText);
        createTextCell(excelRow, col++, formatDate(row.getDateOfBirth()), styles.dataText);
        createTextCell(excelRow, col++, nvl(row.getGender()), styles.dataText);
        createTextCell(excelRow, col++, nvl(row.getServiceCategory()), styles.dataText);
        createTextCell(excelRow, col++, nvl(row.getService()), styles.dataText);
        createTextCell(excelRow, col++, nvl(row.getSalaryCode()), styles.dataText);
        createTextCell(excelRow, col++, nvl(row.getGrade()), styles.dataText);
        createTextCell(excelRow, col++, nvl(row.getNatureOfAppointment()), styles.dataText);
        createTextCell(excelRow, col++, formatDate(row.getDateOfFirstAppointment()), styles.dataText);
        createTextCell(excelRow, col++, nvl(row.getIncremantDate()), styles.dataText);
        createTextCell(excelRow, col++, formatDate(row.getEnteredDateToAllIslandService()), styles.dataText);
        createTextCell(excelRow, col++, formatDate(row.getReportedDateToPresentWorkingPlace()), styles.dataText);
        createTextCell(excelRow, col++, nvl(row.getCurrentWorkingPlace()), styles.dataText);
        createTextCell(excelRow, col++, nvl(row.getCurrentDistrictOfWorking()), styles.dataText);
        createTextCell(excelRow, col++, formatDate(row.getAppointmentDateToPresentClassGrade()), styles.dataText);
        createTextCell(excelRow, col++, formatDate(row.getEnteredDateToNWPCouncil()), styles.dataText);
        createTextCell(excelRow, col++, nvl(row.getPermanentAddress()), styles.dataText);
        createTextCell(excelRow, col++, nvl(row.getResidentDistrict()), styles.dataText);
        createTextCell(excelRow, col++, nvl(row.getContactNo()), styles.dataText);
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
                1600, 9000, 6000, 3000, 3000, 2000, 3000, 6000,
                2500, 2500, 4000, 4000, 2500, 4000, 4000, 6000, 3500,
                4000, 4000, 8000, 3000, 3000
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

        CellStyle dataNumeric = workbook.createCellStyle();
        dataNumeric.setFont(bodyFont);
        dataNumeric.setAlignment(HorizontalAlignment.CENTER);
        dataNumeric.setVerticalAlignment(VerticalAlignment.CENTER);
        applyBorders(dataNumeric, BorderStyle.THIN, BorderStyle.THIN);

        return new ExcelStyles(
                title,
                subtitle,
                meta,
                header,
                dataText,
                dataNumeric
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
            CellStyle dataNumeric
    ) {
    }

    private void addPdfRow(
            PdfPTable table,
            AllEmployeeDetailsReportRowResponse row,
            com.lowagie.text.Font font
    ) {
        table.addCell(cell(row.getSerialNo() != null ? row.getSerialNo().toString() : "", font));
        table.addCell(cell(nvl(row.getEmployeeName()), font));
        table.addCell(cell(nvl(row.getDesignation()), font));
        table.addCell(cell(nvl(row.getNic()), font));
        table.addCell(cell(formatDate(row.getDateOfBirth()), font));
        table.addCell(cell(nvl(row.getGender()), font));
        table.addCell(cell(nvl(row.getServiceCategory()), font));
        table.addCell(cell(nvl(row.getService()), font));
        table.addCell(cell(nvl(row.getSalaryCode()), font));
        table.addCell(cell(nvl(row.getGrade()), font));
        table.addCell(cell(nvl(row.getNatureOfAppointment()), font));
        table.addCell(cell(formatDate(row.getDateOfFirstAppointment()), font));
        table.addCell(cell(nvl(row.getIncremantDate()), font));
        table.addCell(cell(formatDate(row.getEnteredDateToAllIslandService()), font));
        table.addCell(cell(formatDate(row.getReportedDateToPresentWorkingPlace()), font));
        table.addCell(cell(nvl(row.getCurrentWorkingPlace()), font));
        table.addCell(cell(nvl(row.getCurrentDistrictOfWorking()), font));
        table.addCell(cell(formatDate(row.getAppointmentDateToPresentClassGrade()), font));
        table.addCell(cell(formatDate(row.getEnteredDateToNWPCouncil()), font));
        table.addCell(cell(nvl(row.getPermanentAddress()), font));
        table.addCell(cell(nvl(row.getResidentDistrict()), font));
        table.addCell(cell(nvl(row.getContactNo()), font));
    }

    private PdfPCell cell(String text, com.lowagie.text.Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);
        return cell;
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
