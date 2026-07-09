package com.nwpengdep.hrms.controller;

import com.nwpengdep.hrms.audit.AuditAction;
import com.nwpengdep.hrms.audit.AuditEventRequest;
import com.nwpengdep.hrms.audit.AuditSourceModule;
import com.nwpengdep.hrms.dto.AuditLogResponse;
import com.nwpengdep.hrms.dto.AuditLogSearchRequest;
import com.nwpengdep.hrms.service.AuditLogService;
import com.nwpengdep.hrms.service.report.AuditLogExportService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/audit-logs")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ADMINISTRATIONS')")
public class AuditLogController {

    private final AuditLogService auditLogService;
    private final AuditLogExportService auditLogExportService;

    @GetMapping
    public Page<AuditLogResponse> search(@ModelAttribute AuditLogSearchRequest request) {
        return auditLogService.search(request);
    }

    @GetMapping("/{id}")
    public AuditLogResponse getById(@PathVariable Long id) {
        return auditLogService.getById(id);
    }

    @GetMapping("/export/excel")
    public ResponseEntity<byte[]> exportExcel(@ModelAttribute AuditLogSearchRequest request) {
        request.setPage(0);
        request.setSize(10_000);
        Page<AuditLogResponse> page = auditLogService.search(request);
        byte[] data = auditLogExportService.exportExcel(page.getContent());

        auditLogService.log(AuditEventRequest.builder()
                .action(AuditAction.EXPORT)
                .entityType("AuditLog")
                .entityLabel("Audit log export")
                .activitySummary("Export Audit Trail")
                .sourceModule(AuditSourceModule.AUDIT)
                .exportFormat("EXCEL")
                .recordCount(page.getNumberOfElements())
                .sensitive(true)
                .build());

        return ResponseEntity.ok()
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=audit-logs.xlsx"
                )
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                ))
                .body(data);
    }
}
