package com.nwpengdep.hrms.dto;

import java.time.LocalDate;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SalaryIncrementWatchDto {

    private Long employeeId;

    private String employeeName;

    private String designation;

    private String incrementDate;

    private LocalDate dueDate;

    private Integer dueYear;

    private int overdueYears;

    private String status;
}
