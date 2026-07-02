package com.nwpengdep.hrms.dto;

import com.nwpengdep.hrms.audit.AuditAction;
import com.nwpengdep.hrms.audit.AuditSourceModule;
import com.nwpengdep.hrms.audit.AuditStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
@Builder
public class AuditLogResponse {

    private Long id;
    private LocalDateTime occurredAt;
    private AuditAction action;
    private String entityType;
    private String entityId;
    private String entityLabel;
    private String activitySummary;
    private String username;
    private String userRole;
    private String ipAddress;
    private String userAgent;
    private String clientHost;
    private String httpMethod;
    private String requestPath;
    private String correlationId;
    private AuditStatus status;
    private String failureReason;
    private AuditSourceModule sourceModule;
    private String exportFormat;
    private Integer recordCount;
    private Boolean sensitive;
    private List<String> changedFields;
    private Map<String, Object> oldValues;
    private Map<String, Object> newValues;
    private String contentHash;
}
