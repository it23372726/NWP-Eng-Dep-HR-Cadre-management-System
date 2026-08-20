package com.nwpengdep.hrms.service.report;

import com.lowagie.text.Element;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.VerticalAlignment;
import org.apache.poi.ss.usermodel.Workbook;

public final class ReportSignatureBlock {

    public static final String PREPARED_BY = "Prepared By:";
    public static final String CHECKED_BY = "Checked By:";

    /**
     * Default system identity shown under Prepared By on Cadre exports.
     */
    public static final String DEFAULT_SYSTEM_NAME = "HR Cadre Management System";

    private ReportSignatureBlock() {
    }

    public static void addExcelRows(
            Sheet sheet,
            Workbook workbook,
            int lastTableRow,
            int checkedByColumn
    ) {
        addExcelRows(
                sheet,
                workbook,
                lastTableRow,
                checkedByColumn,
                DEFAULT_SYSTEM_NAME
        );
    }

    public static void addExcelRows(
            Sheet sheet,
            Workbook workbook,
            int lastTableRow,
            int checkedByColumn,
            String preparedByName
    ) {
        org.apache.poi.ss.usermodel.Font labelFont = workbook.createFont();
        labelFont.setBold(true);
        labelFont.setFontName("Calibri");
        labelFont.setFontHeightInPoints((short) 10);

        org.apache.poi.ss.usermodel.Font valueFont = workbook.createFont();
        valueFont.setBold(false);
        valueFont.setFontName("Calibri");
        valueFont.setFontHeightInPoints((short) 10);

        CellStyle labelStyle = workbook.createCellStyle();
        labelStyle.setFont(labelFont);
        labelStyle.setAlignment(HorizontalAlignment.LEFT);
        labelStyle.setVerticalAlignment(VerticalAlignment.CENTER);

        CellStyle valueStyle = workbook.createCellStyle();
        valueStyle.setFont(valueFont);
        valueStyle.setAlignment(HorizontalAlignment.LEFT);
        valueStyle.setVerticalAlignment(VerticalAlignment.CENTER);

        int labelRowIdx = lastTableRow + 2;
        Row labels = sheet.createRow(labelRowIdx);
        labels.setHeightInPoints(20f);

        Cell prepared = labels.createCell(0);
        prepared.setCellValue(PREPARED_BY);
        prepared.setCellStyle(labelStyle);

        Cell checked = labels.createCell(checkedByColumn);
        checked.setCellValue(CHECKED_BY);
        checked.setCellStyle(labelStyle);

        Row nameRow = sheet.createRow(labelRowIdx + 1);
        nameRow.setHeightInPoints(24f);

        Cell preparedName = nameRow.createCell(0);
        preparedName.setCellValue(resolvePreparedByName(preparedByName));
        preparedName.setCellStyle(valueStyle);

        Cell checkedName = nameRow.createCell(checkedByColumn);
        checkedName.setCellValue("");
        checkedName.setCellStyle(valueStyle);
    }

    public static PdfPTable pdfTable(
            com.lowagie.text.Font font,
            float totalWidth,
            float preparedWidth
    ) throws com.lowagie.text.DocumentException {
        return pdfTable(font, font, totalWidth, preparedWidth, DEFAULT_SYSTEM_NAME);
    }

    public static PdfPTable pdfTable(
            com.lowagie.text.Font labelFont,
            com.lowagie.text.Font valueFont,
            float totalWidth,
            float preparedWidth,
            String preparedByName
    ) throws com.lowagie.text.DocumentException {
        PdfPTable table = new PdfPTable(2);
        table.setTotalWidth(totalWidth);
        table.setLockedWidth(true);
        table.setWidths(new float[]{
                preparedWidth,
                Math.max(40f, totalWidth - preparedWidth)
        });
        fillSignatureCells(table, labelFont, valueFont, preparedByName);
        return table;
    }

    public static PdfPTable pdfTable(com.lowagie.text.Font font)
            throws com.lowagie.text.DocumentException {
        return pdfTable(font, DEFAULT_SYSTEM_NAME);
    }

    public static PdfPTable pdfTable(
            com.lowagie.text.Font font,
            String preparedByName
    ) throws com.lowagie.text.DocumentException {
        PdfPTable table = new PdfPTable(2);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{38f, 62f});
        fillSignatureCells(table, font, font, preparedByName);
        return table;
    }

    private static void fillSignatureCells(
            PdfPTable table,
            com.lowagie.text.Font labelFont,
            com.lowagie.text.Font valueFont,
            String preparedByName
    ) {
        table.setSpacingBefore(18f);
        table.setSpacingAfter(0f);
        table.addCell(labelCell(PREPARED_BY, labelFont, 20f));
        table.addCell(labelCell(CHECKED_BY, labelFont, 20f));
        table.addCell(labelCell(resolvePreparedByName(preparedByName), valueFont, 24f));
        table.addCell(labelCell(" ", valueFont, 24f));
    }

    private static String resolvePreparedByName(String preparedByName) {
        if (preparedByName == null || preparedByName.isBlank()) {
            return DEFAULT_SYSTEM_NAME;
        }
        return preparedByName.trim();
    }

    private static PdfPCell labelCell(
            String text,
            com.lowagie.text.Font font,
            float height
    ) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setBorder(Rectangle.NO_BORDER);
        cell.setHorizontalAlignment(Element.ALIGN_LEFT);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        cell.setPaddingLeft(0f);
        cell.setPaddingTop(2f);
        cell.setFixedHeight(height);
        return cell;
    }
}
