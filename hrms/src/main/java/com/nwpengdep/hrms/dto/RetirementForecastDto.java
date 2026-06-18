package com.nwpengdep.hrms.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RetirementForecastDto {

    private Integer retiringThisYear;

    private Integer retiringWithinTwoYears;

    private Integer retiringWithinFiveYears;
}
