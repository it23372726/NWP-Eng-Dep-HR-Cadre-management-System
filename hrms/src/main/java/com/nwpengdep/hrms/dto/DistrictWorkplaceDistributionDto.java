package com.nwpengdep.hrms.dto;

import lombok.*;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DistrictWorkplaceDistributionDto {

    private String district;

    private List<EmployeeDistributionDto> workplaces;
}
