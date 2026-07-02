package com.nwpengdep.hrms.dto;

import java.time.LocalDate;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SalaryIncrementStatusDto {

    private boolean applicable;

    private String incrementDate;

    private LocalDate nextDueDate;

    private Integer nextDueYear;

    private int overdueYears;

    private boolean canRecordNow;

    private Integer lastDueYear;

    private LocalDate lastDoneDate;

    private Integer priorDueYear;

    private boolean canCatchUpToCurrentYear;

    private Integer catchUpTargetYear;

    private LocalDate catchUpTargetDueDate;

    private int catchUpYearsCount;

    private String statusLabel;

    private String message;
}
