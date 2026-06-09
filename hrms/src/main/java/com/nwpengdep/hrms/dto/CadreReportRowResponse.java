package com.nwpengdep.hrms.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CadreReportRowResponse {

    private Integer serialNo;

    private Long designationId;

    private String designationName;

    private String serviceCode;

    private String gradeClassDisplay;

    private String salaryCode;

    private String serviceLevelName;

    private long finalApprovedCadre;

    private long employeesAtStartDate;

    private long transferIn;

    private long transferOut;

    private long retiredResignation;

    private long deaths;

    private long promotionsIn;

    private long newAppointments;

    private long dismissals;

    private long vacationOfPost;

    private long permanent;

    private long vacancies;

    private long excess;

    private long casual;

    private long substitute;

    private long contracts;

    private long totalStaff;

    @Builder.Default
    private boolean totalsRow = false;
}
