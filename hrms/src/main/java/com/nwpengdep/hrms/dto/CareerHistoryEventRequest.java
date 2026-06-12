package com.nwpengdep.hrms.dto;

import java.time.LocalDate;

import com.nwpengdep.hrms.entity.EmployeeActionType;
import com.nwpengdep.hrms.entity.Grade;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CareerHistoryEventRequest {

    @NotNull(message = "Career history event type is required")
    private EmployeeActionType actionType;

    @NotNull(message = "Career history event date is required")
    private LocalDate actionDate;

    private Long designationId;

    private Grade grade;

    private Long serviceLevelId;

    private String transferredFrom;

    private String transferredTo;

    private String reason;

    private String remarks;
}
