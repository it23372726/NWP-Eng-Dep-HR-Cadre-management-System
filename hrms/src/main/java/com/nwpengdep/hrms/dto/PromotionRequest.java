package com.nwpengdep.hrms.dto;

import com.nwpengdep.hrms.entity.Grade;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class PromotionRequest {

    @NotNull(message = "Designation is required")
    private Long newDesignationId;

    @NotNull(message = "Grade is required")
    private Grade grade;

    @NotNull(message = "Service level is required")
    private Long serviceLevelId;

    @NotNull(message = "Effective date is required")
    private LocalDate promotionDate;

    private String remarks;
}
