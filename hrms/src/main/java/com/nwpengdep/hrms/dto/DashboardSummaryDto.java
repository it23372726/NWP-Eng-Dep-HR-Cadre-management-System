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

    private Integer permanentEmploymentEmployees;

    private Integer approvedCadre;

    private Integer vacancies;

    private Integer excessEmployees;

    private Integer retirementWatch;

    private Integer probationEmployees;

    private Integer qualifiedForPermanentEmployees;

    private Integer permanentEmployees;

    private Integer eligibleForPermanent;

    private Integer eligibleForGrade2;

    private Integer eligibleForGrade1;

    private Integer eligibleGrade3To2;

    private Integer eligibleGrade2To1;

    private Integer eligibleGrade1ToSupra;

    private Integer eligibleGrade1ToSpecial;

    private Integer recentlyQualified;

    private Integer missingQualifications;

    private Integer promotionsThisYear;

    private Integer newAppointmentsThisYear;
}
