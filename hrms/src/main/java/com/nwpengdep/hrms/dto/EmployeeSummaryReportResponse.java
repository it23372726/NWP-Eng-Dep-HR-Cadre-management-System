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
public class EmployeeSummaryReportResponse {

    private String employeeName;

    private String employeeNo;

    private String designation;

    private LocalDate dateOfBirth;

    private LocalDate dateOfFirstAppointment;

    private String nic;

    private String incremantDate;

    private String salaryCode;

    private LocalDate retirementDateAt55;

    private LocalDate retirementDateAt60;

    private LocalDate enteredDateToNWPCouncil;

    private String currentWorkingPlace;

    private List<WorkplaceHistoryRowDto> workplaceHistory;

    private LocalDateTime generatedAt;
}
