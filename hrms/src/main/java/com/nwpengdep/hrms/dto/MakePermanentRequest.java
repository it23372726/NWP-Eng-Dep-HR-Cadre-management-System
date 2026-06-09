package com.nwpengdep.hrms.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class MakePermanentRequest {

    @NotNull(message = "Confirmation date is required")
    private LocalDate confirmationDate;

    private String remarks;
}
