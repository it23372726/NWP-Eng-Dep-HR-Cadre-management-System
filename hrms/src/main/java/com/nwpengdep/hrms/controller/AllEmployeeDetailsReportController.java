package com.nwpengdep.hrms.controller;

import com.nwpengdep.hrms.dto.AllEmployeeDetailsReportResponse;
import com.nwpengdep.hrms.service.report.AllEmployeeDetailsReportExportService;
import com.nwpengdep.hrms.service.report.AllEmployeeDetailsReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reports/all-employee-details")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('REPORTS')")
public class AllEmployeeDetailsReportController {

    private final AllEmployeeDetailsReportService allEmployeeDetailsReportService;
    private final AllEmployeeDetailsReportExportService allEmployeeDetailsReportExportService;

    @GetMapping
    public AllEmployeeDetailsReportResponse generateReport() {
        return allEmployeeDetailsReportService.generateReport();
    }

    @GetMapping("/export/excel")
    public ResponseEntity<byte[]> exportExcel() {
        byte[] data = allEmployeeDetailsReportExportService.exportExcel();

        return ResponseEntity.ok()
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=all-employee-details-report.xlsx"
                )
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                ))
                .body(data);
    }

    @GetMapping("/export/pdf")
    public ResponseEntity<byte[]> exportPdf() {
        byte[] data = allEmployeeDetailsReportExportService.exportPdf();

        return ResponseEntity.ok()
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=all-employee-details-report.pdf"
                )
                .contentType(MediaType.APPLICATION_PDF)
                .body(data);
    }
}
