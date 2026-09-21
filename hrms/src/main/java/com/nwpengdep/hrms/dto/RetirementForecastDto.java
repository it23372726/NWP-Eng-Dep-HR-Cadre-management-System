package com.nwpengdep.hrms.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RetirementForecastDto {

    private Integer retiringThisYear;

    private Integer retiringWithinOneYear;

    private Integer retiringWithinFiveYears;
}
