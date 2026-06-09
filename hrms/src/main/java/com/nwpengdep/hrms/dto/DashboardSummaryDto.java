package com.nwpengdep.hrms.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DashboardSummaryDto {

    private Integer totalEmployees;

    private Integer activeEmployees;

    private Integer approvedCadre;

    private Integer vacancies;

    private Integer excessEmployees;

    private Integer retirementWatch;

    private Integer probationEmployees;

    private Integer qualifiedForPermanentEmployees;

    private Integer permanentEmployees;
}
