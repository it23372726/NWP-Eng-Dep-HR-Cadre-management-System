package com.nwpengdep.hrms.dto;

import com.nwpengdep.hrms.entity.Grade;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;
import java.util.Set;

@Data
public class ServiceTypeRequest {

    @NotBlank(message = "Service code is required")
    private String serviceCode;

    @NotBlank(message = "Description is required")
    private String description;

    @NotEmpty(message = "At least one allowed grade is required")
    private Set<Grade> allowedGrades;

    private Integer grade2RequiredYears;

    private Integer grade1RequiredYears;

    private Integer supraRequiredYears;

    private Integer specialRequiredYears;

    private List<String> customPermanentRequirements;

    private List<String> customGrade2Requirements;

    private List<String> customGrade1Requirements;

    private List<String> customSupraRequirements;

    private List<String> customSpecialRequirements;
}
