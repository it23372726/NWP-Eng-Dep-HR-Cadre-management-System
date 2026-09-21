package com.nwpengdep.hrms.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmployeeActionUpdateRequest {
    private String expectedHistoryRevision;

    @NotNull(message = "Action date is required")
    private LocalDate actionDate;

    private Long newDesignationId;

    private String department;

    private String office;

    private String toDepartment;

    private String toOffice;

    private String reason;

    private String remarks;

    private String district;
    private String appointmentBasis;
    private String incrementDate;
    private LocalDate firstIncrementDueDate;

    private String grade;

    private String recordedDesignationName;

    private String specialDesignationName;

    private Long serviceLevelId;

    private Long serviceId;

    private String transferredFrom;

    /** Promotion outcome: when true, employee leaves N.W.P. Engineering on promotion. */
    private Boolean transferringOut;

    private String toDistrict;
}
