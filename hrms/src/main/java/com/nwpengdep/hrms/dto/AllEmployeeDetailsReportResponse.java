package com.nwpengdep.hrms.dto;

import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AllEmployeeDetailsReportResponse {

    private LocalDateTime generatedAt;

    private int totalCount;

    /** Optional export heading; defaults to ALL EMPLOYEE DETAILS REPORT. */
    private String reportTitle;

    private List<AllEmployeeDetailsReportRowResponse> rows;
}
