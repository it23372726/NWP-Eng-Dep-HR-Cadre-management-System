package com.nwpengdep.hrms.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DistrictDistributionDto {

    private String district;

    private Long employeeCount;
}
