package com.nwpengdep.hrms.service.report;

import com.nwpengdep.hrms.dto.AuditLogResponse;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AuditLogExportService {

    private static final DateTimeFormatter FORMATTER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    public byte[] exportExcel(List<AuditLogResponse> rows) {
        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {

            Sheet sheet = workbook.createSheet("Audit Logs");
            Row header = sheet.createRow(0);
            String[] columns = {
                    "Event ID", "Timestamp", "Activity", "Event Type", "Module", "Resource Type", "Resource ID",
                    "Resource Label", "Actor", "Role", "Source IP", "Client Host",
                    "User Agent", "Outcome", "Sensitive", "Export Format", "Records Affected",
                    "Request Path", "Correlation ID", "Integrity Hash"
            };

            for (int i = 0; i < columns.length; i++) {
                header.createCell(i).setCellValue(columns[i]);
            }

            int rowIndex = 1;
            for (AuditLogResponse row : rows) {
                Row dataRow = sheet.createRow(rowIndex++);
                dataRow.createCell(0).setCellValue(row.getId());
                dataRow.createCell(1).setCellValue(
                        row.getOccurredAt() == null ? "" : row.getOccurredAt().format(FORMATTER)
                );
                dataRow.createCell(2).setCellValue(nullSafe(row.getActivitySummary()));
                dataRow.createCell(3).setCellValue(
                        row.getAction() == null ? "" : row.getAction().name()
                );
                dataRow.createCell(4).setCellValue(
                        row.getSourceModule() == null ? "" : row.getSourceModule().name()
                );
                dataRow.createCell(5).setCellValue(nullSafe(row.getEntityType()));
                dataRow.createCell(6).setCellValue(nullSafe(row.getEntityId()));
                dataRow.createCell(7).setCellValue(nullSafe(row.getEntityLabel()));
                dataRow.createCell(8).setCellValue(nullSafe(row.getUsername()));
                dataRow.createCell(9).setCellValue(nullSafe(row.getUserRole()));
                dataRow.createCell(10).setCellValue(nullSafe(row.getIpAddress()));
                dataRow.createCell(11).setCellValue(nullSafe(row.getClientHost()));
                dataRow.createCell(12).setCellValue(nullSafe(row.getUserAgent()));
                dataRow.createCell(13).setCellValue(
                        row.getStatus() == null ? "" : row.getStatus().name()
                );
                dataRow.createCell(14).setCellValue(
                        row.getSensitive() != null && row.getSensitive() ? "Yes" : "No"
                );
                dataRow.createCell(15).setCellValue(nullSafe(row.getExportFormat()));
                dataRow.createCell(16).setCellValue(
                        row.getRecordCount() == null ? 0 : row.getRecordCount()
                );
                dataRow.createCell(17).setCellValue(nullSafe(row.getRequestPath()));
                dataRow.createCell(18).setCellValue(nullSafe(row.getCorrelationId()));
                dataRow.createCell(19).setCellValue(nullSafe(row.getContentHash()));
            }

            for (int i = 0; i < columns.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(outputStream);
            return outputStream.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to export audit logs", e);
        }
    }

    private String nullSafe(String value) {
        return value == null ? "" : value;
    }
}
