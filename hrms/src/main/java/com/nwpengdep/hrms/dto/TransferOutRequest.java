package com.nwpengdep.hrms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class TransferOutRequest {

    @NotNull(message = "Transfer date is required")
    private LocalDate transferDate;

    @NotBlank(message = "Transferred to is required")
    private String transferredTo;

    private String remarks;
}
