package com.nwpengdep.hrms.dto;

import com.nwpengdep.hrms.entity.ChildRelationship;
import lombok.Data;

import java.time.LocalDate;

@Data
public class EmployeeChildRequest {

    private String nic;

    private String birthCertificateNo;

    private String fullName;

    private LocalDate dateOfBirth;

    private ChildRelationship relationship;
}
