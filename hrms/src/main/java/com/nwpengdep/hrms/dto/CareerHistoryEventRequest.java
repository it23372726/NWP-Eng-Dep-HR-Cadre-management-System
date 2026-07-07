package com.nwpengdep.hrms.dto;

import java.time.LocalDate;

import com.nwpengdep.hrms.entity.District;
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

    private String recordedDesignationName;

    private String specialDesignationName;

    private Long serviceId;

    private Grade grade;

    private Long serviceLevelId;

    private String department;

    private String office;

    private String toDepartment;

    private String toOffice;

    private District district;

    private District toDistrict;

    private String reason;

    private String remarks;

    /** When true on promotion, employee leaves N.W.P. Engineering on promotion. */
    private Boolean transferringOut;
}
