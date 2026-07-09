package com.nwpengdep.hrms.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class OfficeRequest {

    @NotBlank(message = "Office name is required")
    private String name;

    @NotBlank(message = "District is required")
    private String district;
}
