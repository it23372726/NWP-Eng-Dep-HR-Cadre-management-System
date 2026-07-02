package com.nwpengdep.hrms.dto;

import com.nwpengdep.hrms.entity.Grade;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.Set;

@Data
public class DesignationRequest {

    @NotBlank(message = "Designation name is required")
    private String designationName;

    @NotNull(message = "Service is required")
    private Long serviceId;

    @NotNull(message = "Service level is required")
    private Long serviceLevelId;

    @NotEmpty(message = "At least one allowed grade is required")
    private Set<Grade> allowedGrades;

    private String salaryCode;
}
