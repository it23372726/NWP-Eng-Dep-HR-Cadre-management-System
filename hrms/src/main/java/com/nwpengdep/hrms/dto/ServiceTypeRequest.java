package com.nwpengdep.hrms.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ServiceTypeRequest {

    @NotBlank(message = "Service code is required")
    private String serviceCode;

    @NotBlank(message = "Description is required")
    private String description;
}