package com.nwpengdep.hrms.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class CadrePositionReorderRequest {

    @NotEmpty(message = "Ordered cadre ids are required")
    private List<Long> orderedCadreIds;
}
