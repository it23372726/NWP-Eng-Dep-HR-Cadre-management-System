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

    private ReportSignatureBlock() {
    }

    public static void addExcelRows(
            Sheet sheet,
            Workbook workbook,
            int lastTableRow,
            int checkedByColumn
    ) {
        org.apache.poi.ss.usermodel.Font font = workbook.createFont();
        font.setBold(true);
        font.setFontName("Calibri");
        font.setFontHeightInPoints((short) 10);

        CellStyle style = workbook.createCellStyle();
        style.setFont(font);
        style.setAlignment(HorizontalAlignment.LEFT);
        style.setVerticalAlignment(VerticalAlignment.CENTER);

        int labelRowIdx = lastTableRow + 2;
        Row labels = sheet.createRow(labelRowIdx);
        labels.setHeightInPoints(20f);

        Cell prepared = labels.createCell(0);
        prepared.setCellValue(PREPARED_BY);
        prepared.setCellStyle(style);

        Cell checked = labels.createCell(checkedByColumn);
        checked.setCellValue(CHECKED_BY);
        checked.setCellStyle(style);

        Row nameRow = sheet.createRow(labelRowIdx + 1);
        nameRow.setHeightInPoints(24f);
        nameRow.createCell(0).setCellStyle(style);
        nameRow.createCell(checkedByColumn).setCellStyle(style);
    }

    public static PdfPTable pdfTable(
            com.lowagie.text.Font font,
            float totalWidth,
            float preparedWidth
    ) throws com.lowagie.text.DocumentException {
        PdfPTable table = new PdfPTable(2);
        table.setTotalWidth(totalWidth);
        table.setLockedWidth(true);
        table.setWidths(new float[]{
                preparedWidth,
                Math.max(40f, totalWidth - preparedWidth)
        });
        fillSignatureCells(table, font);
        return table;
    }

    public static PdfPTable pdfTable(com.lowagie.text.Font font)
            throws com.lowagie.text.DocumentException {
        PdfPTable table = new PdfPTable(2);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{38f, 62f});
        fillSignatureCells(table, font);
        return table;
    }

    private static void fillSignatureCells(
            PdfPTable table,
            com.lowagie.text.Font font
    ) {
        table.setSpacingBefore(18f);
        table.setSpacingAfter(0f);
        table.addCell(labelCell(PREPARED_BY, font, 20f));
        table.addCell(labelCell(CHECKED_BY, font, 20f));
        table.addCell(labelCell(" ", font, 24f));
        table.addCell(labelCell(" ", font, 24f));
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
