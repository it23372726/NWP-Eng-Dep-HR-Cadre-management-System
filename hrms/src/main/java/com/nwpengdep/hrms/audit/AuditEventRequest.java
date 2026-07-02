package com.nwpengdep.hrms.audit;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
@Builder
public class AuditEventRequest {

    private AuditAction action;
    private String entityType;
    private String entityId;
    private String entityLabel;
    private AuditSourceModule sourceModule;
    private AuditStatus status;
    private String failureReason;
    private String exportFormat;
    private Integer recordCount;
    private Boolean sensitive;
    private Map<String, Object> oldValues;
    private Map<String, Object> newValues;
    private List<String> changedFields;
    private String usernameOverride;
    private String userRoleOverride;
    private String activitySummary;
}
