package com.nwpengdep.hrms.dto;

import com.nwpengdep.hrms.entity.District;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class TransferOutRequest {

    @NotNull(message = "Transfer date is required")
    private LocalDate transferDate;

    @NotBlank(message = "Destination department is required")
    private String toDepartment;

    @NotBlank(message = "Destination office is required")
    private String toOffice;

    private District toDistrict;

    private String remarks;
}
