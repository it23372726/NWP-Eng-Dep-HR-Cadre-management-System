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

    @NotNull(message = "Action date is required")
    private LocalDate actionDate;

    private Long newDesignationId;

    private String department;

    private String office;

    private String toDepartment;

    private String toOffice;

    private String reason;

    private String remarks;

    private String grade;

    private Long serviceLevelId;
}
