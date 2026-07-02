package com.nwpengdep.hrms.controller;

import com.nwpengdep.hrms.dto.ChangesReportRequest;
import com.nwpengdep.hrms.dto.ChangesReportResponse;
import com.nwpengdep.hrms.service.report.ChangesReportExportService;
import com.nwpengdep.hrms.service.report.ChangesReportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reports/changes")
@RequiredArgsConstructor
public class ChangesReportController {

    private final ChangesReportService changesReportService;
    private final ChangesReportExportService changesReportExportService;

    @PostMapping
    public ChangesReportResponse generateReport(
            @Valid @RequestBody ChangesReportRequest request
    ) {
        return changesReportService.generateReport(request);
    }

    @PostMapping("/export/excel")
    public ResponseEntity<byte[]> exportExcel(
            @Valid @RequestBody ChangesReportRequest request
    ) {
        byte[] data = changesReportExportService.exportExcel(request);

        return ResponseEntity.ok()
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=changes-report.xlsx"
                )
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                ))
                .body(data);
    }

    @PostMapping("/export/pdf")
    public ResponseEntity<byte[]> exportPdf(
            @Valid @RequestBody ChangesReportRequest request
    ) {
        byte[] data = changesReportExportService.exportPdf(request);

        return ResponseEntity.ok()
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=changes-report.pdf"
                )
                .contentType(MediaType.APPLICATION_PDF)
                .body(data);
    }
}
