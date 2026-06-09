package com.nwpengdep.hrms.dto;

import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AllEmployeeDetailsReportRowResponse {

    private Integer serialNo;

    private String employeeName;

    private String designation;

    private String nic;

    private LocalDate dateOfBirth;

    private String gender;

    private String serviceCategory;

    private String service;

    private String salaryCode;

    private String grade;

    private String natureOfAppointment;

    private String employmentType;

    private String permanentStatus;

    private String qualifiedForPermanent;

    private LocalDate permanentQualificationDate;

    private LocalDate permanentConfirmationDate;

    private LocalDate dateOfFirstAppointment;

    private String incremantDate;

    private LocalDate enteredDateToAllIslandService;

    private LocalDate reportedDateToPresentWorkingPlace;

    private String currentWorkingPlace;

    private String currentDistrictOfWorking;

    private LocalDate appointmentDateToPresentClassGrade;

    private LocalDate enteredDateToNWPCouncil;

    private String permanentAddress;

    private String residentDistrict;

    private String contactNo;
}
