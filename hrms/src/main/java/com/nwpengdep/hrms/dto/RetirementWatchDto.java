package com.nwpengdep.hrms.dto;

import lombok.*;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RetirementWatchDto {

    private Long employeeId;

    private String employeeName;

    private String designation;

    private LocalDate dateOfBirth;

    private LocalDate retirementDate;

    private Integer remainingMonths;
}
