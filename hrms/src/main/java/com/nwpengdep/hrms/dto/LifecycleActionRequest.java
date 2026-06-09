package com.nwpengdep.hrms.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class LifecycleActionRequest {

    @NotNull(message = "Action date is required")
    private LocalDate actionDate;

    private String remarks;
}
