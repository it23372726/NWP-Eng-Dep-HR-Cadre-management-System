package com.nwpengdep.hrms.service.report;

import com.lowagie.text.Chunk;
import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.nwpengdep.hrms.dto.EmployeeDependentDetailsReportResponse;
import com.nwpengdep.hrms.entity.ChildRelationship;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
public class EmployeeDependentDetailsReportExportService {

    private static final DateTimeFormatter DATE_FMT =
            DateTimeFormatter.ofPattern("dd-MM-yyyy");
    private static final DateTimeFormatter DATETIME_FMT =
            DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm");

    private final EmployeeDependentDetailsReportService reportService;

    public byte[] exportPdf(Long employeeId) {
        EmployeeDependentDetailsReportResponse report =
                reportService.generateReport(employeeId);

        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 48, 48, 54, 48);
            PdfWriter.getInstance(document, out);
            document.open();

            com.lowagie.text.Font titleFont =
                    FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14);
            com.lowagie.text.Font subtitleFont =
                    FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12);
            com.lowagie.text.Font sectionFont =
                    FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11);
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
                    "North Western Provincial Council — Engineering Department",
                    titleFont
            ));
            document.add(new Paragraph("Dependent Details Report", subtitleFont));
            document.add(new Paragraph(report.getEmployeeName(), subtitleFont));
            document.add(new Paragraph(
                    "Employee No.: " + report.getEmployeeNo(),
                    metaFont
            ));
            document.add(new Paragraph(
                    "Generated: " + report.getGeneratedAt().format(DATETIME_FMT),
                    metaFont
            ));
            document.add(Chunk.NEWLINE);

            document.add(new Paragraph("Personal Information", sectionFont));
            document.add(Chunk.NEWLINE);

            PdfPTable personalTable = new PdfPTable(2);
            personalTable.setWidthPercentage(100);
            personalTable.setWidths(new float[]{2f, 3f});
            addSummaryRow(personalTable, "NIC", report.getNic(), labelFont, valueFont);
            addSummaryRow(
                    personalTable,
                    "Date of Birth",
                    formatDate(report.getDateOfBirth()),
                    labelFont,
                    valueFont
            );
            addSummaryRow(personalTable, "Gender", report.getGender(), labelFont, valueFont);
            addSummaryRow(
                    personalTable,
                    "Marital Status",
                    report.getMaritalStatus(),
                    labelFont,
                    valueFont
            );
            addSummaryRow(
                    personalTable,
                    "Contact Number",
                    report.getContactNo(),
                    labelFont,
                    valueFont
            );
            addSummaryRow(
                    personalTable,
                    "Email Address",
                    report.getEmailAddress(),
                    labelFont,
                    valueFont
            );
            addSummaryRow(
                    personalTable,
                    "Permanent Address",
                    report.getPermanentAddress(),
                    labelFont,
                    valueFont
            );
            document.add(personalTable);
            document.add(Chunk.NEWLINE);

            document.add(new Paragraph("Dependent Details", sectionFont));
            document.add(Chunk.NEWLINE);

            document.add(new Paragraph("Spouse", subtitleFont));
            document.add(Chunk.NEWLINE);

            PdfPTable spouseTable = new PdfPTable(2);
            spouseTable.setWidthPercentage(100);
            spouseTable.setWidths(new float[]{2f, 3f});

            EmployeeDependentDetailsReportResponse.SpouseDetails spouse = report.getSpouse();
            if (spouse == null) {
                addSummaryRow(spouseTable, "Status", "Not recorded", labelFont, valueFont);
            } else {
                addSummaryRow(spouseTable, "NIC", spouse.getNic(), labelFont, valueFont);
                addSummaryRow(spouseTable, "Name", spouse.getFullName(), labelFont, valueFont);
                addSummaryRow(
                        spouseTable,
                        "Date of Birth",
                        formatDate(spouse.getDateOfBirth()),
                        labelFont,
                        valueFont
                );
            }
            document.add(spouseTable);
            document.add(Chunk.NEWLINE);

            document.add(new Paragraph("Children", subtitleFont));
            document.add(Chunk.NEWLINE);

            PdfPTable childrenTable = new PdfPTable(6);
            childrenTable.setWidthPercentage(100);
            childrenTable.setWidths(new float[]{0.5f, 1.2f, 1.4f, 1.6f, 1.1f, 1f});
            childrenTable.setHeaderRows(1);

            childrenTable.addCell(headerCell("No.", headerFont));
            childrenTable.addCell(headerCell("NIC", headerFont));
            childrenTable.addCell(headerCell("Birth Cert. No.", headerFont));
            childrenTable.addCell(headerCell("Name", headerFont));
            childrenTable.addCell(headerCell("Date of Birth", headerFont));
            childrenTable.addCell(headerCell("Relationship", headerFont));

            List<EmployeeDependentDetailsReportResponse.ChildDetails> children =
                    report.getChildren();
            if (children == null || children.isEmpty()) {
                PdfPCell emptyCell = new PdfPCell(
                        new Phrase("No children recorded.", cellFont)
                );
                emptyCell.setColspan(6);
                emptyCell.setHorizontalAlignment(Element.ALIGN_CENTER);
                emptyCell.setPadding(6f);
                childrenTable.addCell(emptyCell);
            } else {
                for (int index = 0; index < children.size(); index++) {
                    EmployeeDependentDetailsReportResponse.ChildDetails child =
                            children.get(index);
                    childrenTable.addCell(
                            dataCell(String.valueOf(index + 1), cellFont, Element.ALIGN_CENTER)
                    );
                    childrenTable.addCell(dataCell(child.getNic(), cellFont));
                    childrenTable.addCell(dataCell(child.getBirthCertificateNo(), cellFont));
                    childrenTable.addCell(dataCell(child.getFullName(), cellFont));
                    childrenTable.addCell(
                            dataCell(formatDate(child.getDateOfBirth()), cellFont)
                    );
                    childrenTable.addCell(
                            dataCell(formatRelationship(child.getRelationship()), cellFont)
                    );
                }
            }

            document.add(childrenTable);
            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException(
                    "Failed to export employee dependent details PDF",
                    e
            );
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

    private PdfPCell dataCell(
            String text,
            com.lowagie.text.Font font,
            int alignment
    ) {
        PdfPCell cell = new PdfPCell(new Phrase(nvl(text), font));
        cell.setHorizontalAlignment(alignment);
        cell.setPadding(5f);
        return cell;
    }

    private PdfPCell dataCell(String text, com.lowagie.text.Font font) {
        return dataCell(text, font, Element.ALIGN_LEFT);
    }

    private String formatRelationship(ChildRelationship relationship) {
        if (relationship == ChildRelationship.SON) {
            return "Son";
        }
        if (relationship == ChildRelationship.DAUGHTER) {
            return "Daughter";
        }
        return "—";
    }

    private String formatDate(LocalDate date) {
        return date != null ? date.format(DATE_FMT) : "—";
    }

    private String nvl(String value) {
        return value != null && !value.isBlank() ? value : "—";
    }
}
