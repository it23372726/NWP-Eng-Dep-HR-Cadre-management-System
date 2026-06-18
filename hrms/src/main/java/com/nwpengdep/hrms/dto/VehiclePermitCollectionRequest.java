package com.nwpengdep.hrms.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class VehiclePermitCollectionRequest {

    @NotNull(message = "Collection date is required")
    private LocalDate collectedDate;
}
