package com.nwpengdep.hrms.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;

@Data
@Builder
public class VehiclePermitStatusDto {

    private boolean applicable;

    private LocalDate seniorSinceDate;

    private LocalDate lastCollectedDate;

    private LocalDate nextCollectableDate;

    private boolean canCollectNow;

    private String message;
}
