package com.nwpengdep.hrms.dto;

import lombok.Data;

import java.time.LocalDate;

@Data
public class EmployeeSpouseRequest {

    private String nic;

    private String fullName;

    private LocalDate dateOfBirth;
}
