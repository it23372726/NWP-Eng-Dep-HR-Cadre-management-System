package com.nwpengdep.hrms.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class TransferRequest {

    @NotNull(message = "Employee is required")
    private Long employeeId;

    @NotNull(message = "New designation is required")
    private Long newDesignationId;

    private String currentWorkingPlace;
}
