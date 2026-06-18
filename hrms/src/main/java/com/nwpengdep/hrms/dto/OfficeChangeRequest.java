package com.nwpengdep.hrms.dto;

import java.time.LocalDate;

import com.nwpengdep.hrms.entity.District;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class OfficeChangeRequest {

    @NotNull(message = "Effective date is required")
    private LocalDate effectiveDate;

    @NotBlank(message = "Office is required")
    private String office;

    private District district;

    private String remarks;
}
