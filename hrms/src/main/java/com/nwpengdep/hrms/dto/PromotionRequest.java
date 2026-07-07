package com.nwpengdep.hrms.dto;

import com.nwpengdep.hrms.entity.District;
import com.nwpengdep.hrms.entity.Grade;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class PromotionRequest {

    private Long newDesignationId;

    private String recordedDesignationName;

    private String specialDesignationName;

    @NotNull(message = "Grade is required")
    private Grade grade;

    @NotNull(message = "Service level is required")
    private Long serviceLevelId;

    @NotNull(message = "Effective date is required")
    private LocalDate promotionDate;

    private String remarks;

    private Boolean ebGrade2Passed;

    private Boolean otherGrade2RequirementCompleted;

    private Integer grade2RequiredYears;

    private List<EmployeeRequirementRequest> requirements;

    /** When true, employee is promoted and leaves N.W.P. Engineering (cadre: promotion only). */
    private Boolean transferringOut;

    private String toDepartment;

    private String toOffice;

    private District toDistrict;
}
