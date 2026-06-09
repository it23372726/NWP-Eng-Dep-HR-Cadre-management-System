package com.nwpengdep.hrms.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CadrePositionRequest {

    @NotNull(message = "Designation is required")
    private Long designationId;

    @NotNull(message = "Approved count is required")
    private Integer approvedCount;
}
