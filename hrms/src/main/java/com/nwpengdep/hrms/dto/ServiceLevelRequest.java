package com.nwpengdep.hrms.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ServiceLevelRequest {

    @NotBlank(message = "Level name is required")
    private String levelName;
}
