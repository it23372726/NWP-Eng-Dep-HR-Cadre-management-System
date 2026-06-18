package com.nwpengdep.hrms.dto;

import com.nwpengdep.hrms.entity.District;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class OfficeRequest {

    @NotBlank(message = "Office name is required")
    private String name;

    @NotNull(message = "District is required")
    private District district;
}
