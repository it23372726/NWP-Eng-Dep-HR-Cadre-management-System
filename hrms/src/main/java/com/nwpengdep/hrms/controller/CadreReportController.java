package com.nwpengdep.hrms.controller;

import com.nwpengdep.hrms.dto.CadreReportRequest;
import com.nwpengdep.hrms.dto.CadreReportResponse;
import com.nwpengdep.hrms.service.report.CadreReportExportService;
import com.nwpengdep.hrms.service.report.CadreReportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reports/cadre")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('REPORTS')")
public class CadreReportController {

    private final CadreReportService cadreReportService;
    private final CadreReportExportService cadreReportExportService;

    @PostMapping
    public CadreReportResponse generateReport(
            @Valid @RequestBody CadreReportRequest request
    ) {
        return cadreReportService.generateReport(request);
    }

    @PostMapping("/export/excel")
    public ResponseEntity<byte[]> exportExcel(
            @Valid @RequestBody CadreReportRequest request
    ) {
        byte[] data = cadreReportExportService.exportExcel(request);

        return ResponseEntity.ok()
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=cadre-report.xlsx"
                )
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                ))
                .body(data);
    }

    @PostMapping("/export/pdf")
    public ResponseEntity<byte[]> exportPdf(
            @Valid @RequestBody CadreReportRequest request
    ) {
        byte[] data = cadreReportExportService.exportPdf(request);

        return ResponseEntity.ok()
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=cadre-report.pdf"
                )
                .contentType(MediaType.APPLICATION_PDF)
                .body(data);
    }
}
