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
import com.lowagie.text.FontFactory;
import com.nwpengdep.hrms.dto.VacancyReportResponse;
import com.nwpengdep.hrms.service.CadrePositionService;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
public class VacancyReportExportService {

    private static final String[] HEADERS = {
            "Designation",
            "Service",
            "Service Level",
            "Approved Cadre",
            "Current Employees",
            "Vacancy",
            "Excess"
    };

    private final CadrePositionService cadrePositionService;

    public byte[] exportExcel() {
        List<VacancyReportResponse> rows = cadrePositionService.getVacancyReport();

        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            Sheet sheet = workbook.createSheet("Vacancy & Excess");
            PrintSetup ps = sheet.getPrintSetup();
            ps.setLandscape(true);
            ps.setPaperSize(PrintSetup.A4_PAPERSIZE);
            ps.setFitWidth((short) 1);
            ps.setFitHeight((short) 0);
            sheet.setFitToPage(true);
            sheet.setHorizontallyCenter(true);

            ExcelStyles styles = createStyles(workbook);

            int rowIdx = 0;
            Row title = sheet.createRow(rowIdx++);
            title.setHeightInPoints(24f);
            Cell titleCell = title.createCell(0);
            titleCell.setCellValue("CADRE VACANCY & EXCESS REPORT");
            titleCell.setCellStyle(styles.title);
            sheet.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(
                    0, 0, 0, HEADERS.length - 1
            ));

            Row meta = sheet.createRow(rowIdx++);
            Cell metaCell = meta.createCell(0);
            metaCell.setCellValue("Generated: " + LocalDateTime.now().format(
                    DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm")
            ));
            metaCell.setCellStyle(styles.meta);
            sheet.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(
                    1, 1, 0, HEADERS.length - 1
            ));

            rowIdx++;

            int headerRowIdx = rowIdx;
            Row headerRow = sheet.createRow(rowIdx++);
            headerRow.setHeightInPoints(20f);
            for (int i = 0; i < HEADERS.length; i++) {
                Cell c = headerRow.createCell(i);
                c.setCellValue(HEADERS[i]);
                c.setCellStyle(styles.header);
            }
            sheet.setRepeatingRows(new org.apache.poi.ss.util.CellRangeAddress(
                    headerRowIdx, headerRowIdx, 0, HEADERS.length - 1
            ));

            for (VacancyReportResponse r : rows) {
                Row dataRow = sheet.createRow(rowIdx++);
                writeRow(dataRow, r, styles);
            }

            sheet.setColumnWidth(0, 9000);
            sheet.setColumnWidth(1, 2500);
            sheet.setColumnWidth(2, 3500);
            sheet.setColumnWidth(3, 3200);
            sheet.setColumnWidth(4, 3800);
            sheet.setColumnWidth(5, 2500);
            sheet.setColumnWidth(6, 2500);

            workbook.write(out);
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to export vacancy report Excel", e);
        }
    }

    public byte[] exportPdf() {
        List<VacancyReportResponse> rows = cadrePositionService.getVacancyReport();

        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4.rotate(), 36, 36, 54, 36);
            PdfWriter.getInstance(document, out);
            document.open();

            com.lowagie.text.Font titleFont =
                    FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14);
            com.lowagie.text.Font metaFont =
                    FontFactory.getFont(FontFactory.HELVETICA, 10);
            com.lowagie.text.Font headerFont =
                    FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9);
            com.lowagie.text.Font cellFont =
                    FontFactory.getFont(FontFactory.HELVETICA, 9);

            document.add(new Paragraph("Cadre Vacancy & Excess Report", titleFont));
            document.add(new Paragraph(
                    "Generated: " + LocalDateTime.now().format(
                            DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm")
                    ),
                    metaFont
            ));
            document.add(Chunk.NEWLINE);

            PdfPTable table = new PdfPTable(HEADERS.length);
            table.setWidthPercentage(100);
            table.setHeaderRows(1);

            for (String h : HEADERS) {
                PdfPCell cell = new PdfPCell(new Phrase(h, headerFont));
                cell.setHorizontalAlignment(Element.ALIGN_CENTER);
                cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
                cell.setBackgroundColor(new java.awt.Color(220, 220, 220));
                table.addCell(cell);
            }

            for (VacancyReportResponse r : rows) {
                table.addCell(cell(nvl(r.getDesignationName()), cellFont, Element.ALIGN_LEFT));
                table.addCell(cell(nvl(r.getServiceCode()), cellFont, Element.ALIGN_CENTER));
                table.addCell(cell(nvl(r.getServiceLevelName()), cellFont, Element.ALIGN_CENTER));
                table.addCell(cell(String.valueOf(nvlNum(r.getApprovedCount())), cellFont, Element.ALIGN_CENTER));
                table.addCell(cell(String.valueOf(nvlNum(r.getCurrentCount())), cellFont, Element.ALIGN_CENTER));
                table.addCell(cell(String.valueOf(nvlNum(r.getVacancyCount())), cellFont, Element.ALIGN_CENTER));
                table.addCell(cell(String.valueOf(nvlNum(r.getExcessCount())), cellFont, Element.ALIGN_CENTER));
            }

            document.add(table);
            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to export vacancy report PDF", e);
        }
    }

    private void writeRow(Row row, VacancyReportResponse r, ExcelStyles styles) {
        row.setHeightInPoints(18f);
        boolean isTotal = r.isTotalsRow();
        CellStyle text = isTotal ? styles.totalText : styles.text;
        CellStyle num = isTotal ? styles.totalNumeric : styles.numeric;

        Cell c0 = row.createCell(0);
        c0.setCellValue(nvl(r.getDesignationName()));
        c0.setCellStyle(text);

        createTextCell(row, 1, nvl(r.getServiceCode()), text);
        createTextCell(row, 2, nvl(r.getServiceLevelName()), text);

        createNumCell(row, 3, nvlNum(r.getApprovedCount()), num);
        createNumCell(row, 4, nvlNum(r.getCurrentCount()), num);
        createNumCell(row, 5, nvlNum(r.getVacancyCount()), num);
        createNumCell(row, 6, nvlNum(r.getExcessCount()), num);
    }

    private void createTextCell(Row row, int idx, String value, CellStyle style) {
        Cell c = row.createCell(idx);
        c.setCellValue(value);
        c.setCellStyle(style);
    }

    private void createNumCell(Row row, int idx, long value, CellStyle style) {
        Cell c = row.createCell(idx);
        c.setCellValue(value);
        c.setCellStyle(style);
    }

    private ExcelStyles createStyles(Workbook workbook) {
        Font titleFont = workbook.createFont();
        titleFont.setBold(true);
        titleFont.setFontName("Calibri");
        titleFont.setFontHeightInPoints((short) 14);

        Font metaFont = workbook.createFont();
        metaFont.setFontName("Calibri");
        metaFont.setFontHeightInPoints((short) 10);

        Font headerFont = workbook.createFont();
        headerFont.setBold(true);
        headerFont.setFontName("Calibri");
        headerFont.setFontHeightInPoints((short) 10);

        Font bodyFont = workbook.createFont();
        bodyFont.setFontName("Calibri");
        bodyFont.setFontHeightInPoints((short) 10);

        Font totalFont = workbook.createFont();
        totalFont.setBold(true);
        totalFont.setFontName("Calibri");
        totalFont.setFontHeightInPoints((short) 10);

        CellStyle title = workbook.createCellStyle();
        title.setAlignment(HorizontalAlignment.CENTER);
        title.setVerticalAlignment(VerticalAlignment.CENTER);
        title.setFont(titleFont);

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
        header.setBorderTop(BorderStyle.MEDIUM);
        header.setBorderBottom(BorderStyle.MEDIUM);
        header.setBorderLeft(BorderStyle.MEDIUM);
        header.setBorderRight(BorderStyle.MEDIUM);

        CellStyle text = workbook.createCellStyle();
        text.setFont(bodyFont);
        text.setAlignment(HorizontalAlignment.LEFT);
        text.setVerticalAlignment(VerticalAlignment.CENTER);
        text.setWrapText(true);
        setThinBorders(text);

        CellStyle numeric = workbook.createCellStyle();
        numeric.setFont(bodyFont);
        numeric.setAlignment(HorizontalAlignment.CENTER);
        numeric.setVerticalAlignment(VerticalAlignment.CENTER);
        setThinBorders(numeric);

        CellStyle totalText = workbook.createCellStyle();
        totalText.cloneStyleFrom(text);
        totalText.setFont(totalFont);
        totalText.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        totalText.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        totalText.setBorderTop(BorderStyle.MEDIUM);

        CellStyle totalNumeric = workbook.createCellStyle();
        totalNumeric.cloneStyleFrom(numeric);
        totalNumeric.setFont(totalFont);
        totalNumeric.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        totalNumeric.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        totalNumeric.setBorderTop(BorderStyle.MEDIUM);

        return new ExcelStyles(title, meta, header, text, numeric, totalText, totalNumeric);
    }

    private void setThinBorders(CellStyle style) {
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
    }

    private PdfPCell cell(String text, com.lowagie.text.Font font, int align) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setHorizontalAlignment(align);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        return cell;
    }

    private String nvl(String value) {
        return value != null ? value : "—";
    }

    private long nvlNum(Number n) {
        return n != null ? n.longValue() : 0L;
    }

    private record ExcelStyles(
            CellStyle title,
            CellStyle meta,
            CellStyle header,
            CellStyle text,
            CellStyle numeric,
            CellStyle totalText,
            CellStyle totalNumeric
    ) {}
}

