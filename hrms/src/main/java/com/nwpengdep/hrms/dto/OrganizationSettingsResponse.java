package com.nwpengdep.hrms.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.List;

@Data
@Builder
public class OrganizationSettingsResponse {

    private String primaryDepartmentName;
    private String provincialCouncilName;
    private String departmentShortName;
    private String applicationName;
    private String councilLabel;
    private List<String> districts;
    private String reportHeaderSubtitle;
    private String reportHeaderUppercase;
    private Instant updatedAt;
}
