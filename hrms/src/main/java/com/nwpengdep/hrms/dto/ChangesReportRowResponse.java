package com.nwpengdep.hrms.dto;

import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChangesReportRowResponse {

    private Integer serialNo;

    private String fullName;

    private String designation;

    private String nic;

    private String employmentType;

    private String action;

    private LocalDate actionDate;
}
