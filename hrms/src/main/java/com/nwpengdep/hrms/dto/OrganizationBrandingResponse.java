package com.nwpengdep.hrms.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class OrganizationBrandingResponse {

    private String primaryDepartmentName;
    private String applicationName;
    private boolean hasLogo;
    private Instant updatedAt;
}
