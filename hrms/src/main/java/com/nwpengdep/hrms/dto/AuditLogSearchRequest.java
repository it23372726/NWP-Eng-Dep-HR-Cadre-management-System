package com.nwpengdep.hrms.dto;

import com.nwpengdep.hrms.audit.AuditAction;
import com.nwpengdep.hrms.audit.AuditSourceModule;
import com.nwpengdep.hrms.audit.AuditStatus;
import lombok.Data;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDate;

@Data
public class AuditLogSearchRequest {

    private int page = 0;
    private int size = 50;
    private String username;
    private AuditAction action;
    private AuditSourceModule sourceModule;
    private AuditStatus status;
    private String entityType;
    private String entityId;
    private String ipAddress;
    private Boolean sensitive;
    private String search;

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate from;

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate to;
}
