package com.nwpengdep.hrms.audit;

import lombok.Builder;
import lombok.Value;

import java.util.Map;

@Value
@Builder
public class AuditActivityDetails {

    String activitySummary;
    String activityType;
    String entityLabel;
    Map<String, Object> details;
}
