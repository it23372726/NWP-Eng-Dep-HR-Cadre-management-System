package com.nwpengdep.hrms.dto;

import com.nwpengdep.hrms.entity.RequirementStatus;
import com.nwpengdep.hrms.entity.RequirementType;
import lombok.Data;

import java.time.LocalDate;

@Data
public class EmployeeRequirementRequest {

    private RequirementType requirementType;

    private String requirementName;

    private RequirementStatus status;

    private LocalDate completedDate;

    private String remarks;
}
