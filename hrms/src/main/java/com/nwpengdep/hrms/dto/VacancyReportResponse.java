package com.nwpengdep.hrms.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VacancyReportResponse {

    private String designationName;

    private String serviceCode;

    private String serviceLevelName;

    private Integer approvedCount;

    private Long currentCount;

    private Long vacancyCount;

    private Long excessCount;

    private boolean totalsRow;
}
