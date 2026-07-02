package com.nwpengdep.hrms.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ChangesReportRequest {

    @NotNull(message = "Year is required")
    @Min(value = 1900, message = "Year must be 1900 or later")
    @Max(value = 2100, message = "Year must be 2100 or earlier")
    private Integer year;

    @NotNull(message = "Month is required")
    @Min(value = 1, message = "Month must be between 1 and 12")
    @Max(value = 12, message = "Month must be between 1 and 12")
    private Integer month;
}
