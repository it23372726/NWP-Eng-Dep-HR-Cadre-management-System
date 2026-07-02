package com.nwpengdep.hrms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class VacationOfPostRequest {

    @NotNull(message = "Action date is required")
    private LocalDate actionDate;

    @NotBlank(message = "Reason is required")
    private String reason;

    private String remarks;
}
