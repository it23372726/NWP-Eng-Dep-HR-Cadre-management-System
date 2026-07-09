package com.nwpengdep.hrms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class OrganizationSettingsUpdateRequest {

    @NotBlank(message = "Primary department name is required")
    private String primaryDepartmentName;

    @NotBlank(message = "Provincial council name is required")
    private String provincialCouncilName;

    @NotBlank(message = "Department short name is required")
    private String departmentShortName;

    @NotBlank(message = "Application name is required")
    private String applicationName;

    @NotBlank(message = "Council label is required")
    private String councilLabel;

    @NotEmpty(message = "At least one district is required")
    private List<String> districts;

    /**
     * Required when primary department name changes.
     * MIGRATE_EXISTING | KEEP_EXISTING
     */
    private String departmentRenameMode;
}
