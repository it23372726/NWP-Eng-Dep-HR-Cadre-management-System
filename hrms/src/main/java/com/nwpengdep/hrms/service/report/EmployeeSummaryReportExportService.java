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
import com.nwpengdep.hrms.dto.EmployeeSummaryReportResponse;
import com.nwpengdep.hrms.dto.OrganizationSettingsResponse;
import com.nwpengdep.hrms.dto.WorkplaceHistoryRowDto;
import com.nwpengdep.hrms.service.OrganizationSettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
public class EmployeeSummaryReportExportService {

    private static final DateTimeFormatter DATE_FMT =
            DateTimeFormatter.ofPattern("dd-MM-yyyy");
    private static final DateTimeFormatter DATETIME_FMT =
            DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm");

    private final EmployeeSummaryReportService employeeSummaryReportService;
    private final OrganizationSettingsService organizationSettingsService;

    public byte[] exportPdf(Long employeeId) {
        EmployeeSummaryReportResponse report =
                employeeSummaryReportService.generateReport(employeeId);
        OrganizationSettingsResponse branding = organizationSettingsService.getSettings();

        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 48, 48, 54, 48);
            PdfWriter.getInstance(document, out);
            document.open();

            com.lowagie.text.Font titleFont =
                    FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14);
            com.lowagie.text.Font subtitleFont =
                    FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12);
            com.lowagie.text.Font metaFont =
                    FontFactory.getFont(FontFactory.HELVETICA, 10);
            com.lowagie.text.Font labelFont =
                    FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10);
            com.lowagie.text.Font valueFont =
                    FontFactory.getFont(FontFactory.HELVETICA, 10);
            com.lowagie.text.Font headerFont =
                    FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10);
            com.lowagie.text.Font cellFont =
                    FontFactory.getFont(FontFactory.HELVETICA, 10);

            document.add(new Paragraph(
                    branding.getReportHeaderSubtitle(),
                    titleFont
            ));
            document.add(new Paragraph("Employee Summary", subtitleFont));
            document.add(new Paragraph(report.getEmployeeName(), subtitleFont));
            document.add(new Paragraph(
                    "Generated: " + report.getGeneratedAt().format(DATETIME_FMT),
                    metaFont
            ));
            document.add(Chunk.NEWLINE);

            PdfPTable summaryTable = new PdfPTable(2);
            summaryTable.setWidthPercentage(100);
            summaryTable.setWidths(new float[]{2f, 3f});

            addSummaryRow(summaryTable, "Name", report.getEmployeeName(), labelFont, valueFont);
            addSummaryRow(summaryTable, "Designation", report.getDesignation(), labelFont, valueFont);
            addSummaryRow(summaryTable, "Date of Birth", formatDate(report.getDateOfBirth()), labelFont, valueFont);
            addSummaryRow(summaryTable, "First Appointment Date",
                    formatDate(report.getDateOfFirstAppointment()), labelFont, valueFont);
            addSummaryRow(summaryTable, "NIC", report.getNic(), labelFont, valueFont);
            addSummaryRow(summaryTable, "Increment Date", report.getIncremantDate(), labelFont, valueFont);
            addSummaryRow(summaryTable, "Widows' and Orphans' Pension No.",
                    report.getWidowsOrphansPensionNo(), labelFont, valueFont);
            addSummaryRow(summaryTable, "Salary Code", report.getSalaryCode(), labelFont, valueFont);
            addSummaryRow(summaryTable, "Retirement Date (55 years)",
                    formatDate(report.getRetirementDateAt55()), labelFont, valueFont);
            addSummaryRow(summaryTable, "Retirement Date (60 years)",
                    formatDate(report.getRetirementDateAt60()), labelFont, valueFont);
            addSummaryRow(summaryTable, "Date Entered to NWP Council",
                    formatDate(report.getEnteredDateToNWPCouncil()), labelFont, valueFont);
            addSummaryRow(summaryTable, "Current Working Place",
                    report.getCurrentWorkingPlace(), labelFont, valueFont);

            document.add(summaryTable);
            document.add(Chunk.NEWLINE);

            document.add(new Paragraph("Workplace History", subtitleFont));
            document.add(Chunk.NEWLINE);

            PdfPTable historyTable = new PdfPTable(3);
            historyTable.setWidthPercentage(100);
            historyTable.setWidths(new float[]{1.2f, 1.2f, 2.6f});
            historyTable.setHeaderRows(1);

            historyTable.addCell(headerCell("From Date", headerFont));
            historyTable.addCell(headerCell("To Date", headerFont));
            historyTable.addCell(headerCell("Working Place", headerFont));

            if (report.getWorkplaceHistory() == null || report.getWorkplaceHistory().isEmpty()) {
                PdfPCell emptyCell = new PdfPCell(new Phrase("No workplace history recorded.", cellFont));
                emptyCell.setColspan(3);
                emptyCell.setHorizontalAlignment(Element.ALIGN_CENTER);
                historyTable.addCell(emptyCell);
            } else {
                for (WorkplaceHistoryRowDto row : report.getWorkplaceHistory()) {
                    historyTable.addCell(dataCell(formatDate(row.getFromDate()), cellFont));
                    historyTable.addCell(dataCell(formatToDate(row), cellFont));
                    historyTable.addCell(dataCell(nvl(row.getWorkingPlace()), cellFont));
                }
            }

            document.add(historyTable);
            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to export employee summary PDF", e);
        }
    }

    private void addSummaryRow(
            PdfPTable table,
            String label,
            String value,
            com.lowagie.text.Font labelFont,
            com.lowagie.text.Font valueFont
    ) {
        PdfPCell labelCell = new PdfPCell(new Phrase(label, labelFont));
        labelCell.setBackgroundColor(new java.awt.Color(240, 240, 240));
        labelCell.setPadding(6f);
        table.addCell(labelCell);

        PdfPCell valueCell = new PdfPCell(new Phrase(nvl(value), valueFont));
        valueCell.setPadding(6f);
        table.addCell(valueCell);
    }

    private PdfPCell headerCell(String text, com.lowagie.text.Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        cell.setBackgroundColor(new java.awt.Color(220, 220, 220));
        cell.setPadding(6f);
        return cell;
    }

    private PdfPCell dataCell(String text, com.lowagie.text.Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setPadding(5f);
        return cell;
    }

    private String formatToDate(WorkplaceHistoryRowDto row) {
        if (row.getToDateLabel() != null && !row.getToDateLabel().isBlank()) {
            return row.getToDateLabel();
        }
        return formatDate(row.getToDate());
    }

    private String formatDate(LocalDate date) {
        return date != null ? date.format(DATE_FMT) : "—";
    }

    private String nvl(String value) {
        return value != null && !value.isBlank() ? value : "—";
    }
}
