package com.nwpengdep.hrms.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SalaryIncrementRecordRequest {

    @NotNull(message = "Increment done date is required")
    private LocalDate doneDate;

    private boolean catchUpToCurrentYear;
}
