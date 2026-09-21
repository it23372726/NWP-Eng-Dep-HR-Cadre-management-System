package com.nwpengdep.hrms.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class OfficeChangeRequest {

    @NotNull(message = "Effective date is required")
    private LocalDate effectiveDate;

    @NotBlank(message = "Office is required")
    private String office;

    private String district;

    /** Local title used for the same declared designation at the new office. Blank clears it. */
    private String specialDesignationName;

    private String remarks;
}
