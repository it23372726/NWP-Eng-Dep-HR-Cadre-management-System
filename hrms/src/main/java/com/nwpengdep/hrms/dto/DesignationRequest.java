package com.nwpengdep.hrms.dto;

import com.nwpengdep.hrms.entity.Grade;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;
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

    private Integer grade2RequiredYears;

    private Integer grade1RequiredYears;

    private List<String> customPermanentRequirements;

    private List<String> customGrade2Requirements;

    private List<String> customGrade1Requirements;

    public String getDesignationName() {
        return designationName;
    }

    public Long getServiceId() {
        return serviceId;
    }

    public Long getServiceLevelId() {
        return serviceLevelId;
    }

    public Set<Grade> getAllowedGrades() {
        return allowedGrades;
    }

    public String getSalaryCode() {
        return salaryCode;
    }

    public Integer getGrade2RequiredYears() {
        return grade2RequiredYears;
    }

    public Integer getGrade1RequiredYears() {
        return grade1RequiredYears;
    }

    public List<String> getCustomPermanentRequirements() {
        return customPermanentRequirements;
    }

    public List<String> getCustomGrade2Requirements() {
        return customGrade2Requirements;
    }

    public List<String> getCustomGrade1Requirements() {
        return customGrade1Requirements;
    }
}
