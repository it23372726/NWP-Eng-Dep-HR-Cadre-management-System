package com.nwpengdep.hrms.dto;

import java.time.LocalDate;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.nwpengdep.hrms.entity.SalaryIncrementOperationType;

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

    private LocalDate lastDueDate;

    private LocalDate lastDoneDate;

    private Integer priorDueYear;

    private boolean canCatchUpToCurrentYear;

    private Integer catchUpTargetYear;

    private LocalDate catchUpTargetDueDate;

    private int catchUpYearsCount;

    private String statusLabel;

    private String message;

    private boolean hasRecordedIncrement;

    private boolean canEdit;

    private boolean canUndo;

    private UUID lastOperationId;

    private SalaryIncrementOperationType lastOperationType;

    private Integer lastOperationFromYear;

    private Integer lastOperationToYear;

    private int lastOperationRecordCount;

    @JsonInclude(JsonInclude.Include.NON_NULL)
    private UUID reversedOperationId;
}
