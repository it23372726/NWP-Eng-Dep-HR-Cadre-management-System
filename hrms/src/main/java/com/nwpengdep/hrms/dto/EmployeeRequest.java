package com.nwpengdep.hrms.dto;

import com.nwpengdep.hrms.entity.District;
import com.nwpengdep.hrms.entity.EmployeeEntryType;
import com.nwpengdep.hrms.entity.EmploymentType;
import com.nwpengdep.hrms.entity.Grade;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class EmployeeRequest {

    @NotNull(message = "Employee entry type is required")
    private EmployeeEntryType entryType;

    @NotBlank(message = "Employee number is required")
    private String employeeNo;

    @NotBlank(message = "Name is required")
    private String fullName;

    @NotNull(message = "Designation is required")
    private Long designationId;

    @NotBlank(message = "NIC is required")
    private String nic;

    @NotNull(message = "Date of birth is required")
    private LocalDate dateOfBirth;

    @NotBlank(message = "Gender is required")
    private String gender;

    private Grade grade;

    @NotNull(message = "Date of first appointment is required")
    private LocalDate dateOfFirstAppointment;

    private String incremantDate;

    private LocalDate enteredDateToAllIslandService;

    @NotNull(message = "Reported date to present working place is required")
    private LocalDate reportedDateToPresentWorkingPlace;

    @NotBlank(message = "Current working place is required")
    private String currentWorkingPlace;

    @NotNull(message = "Current district of working is required")
    private District currentDistrictOfWorking;

    @NotNull(message = "Appointment date to present class/grade is required")
    private LocalDate appointmentDateToPresentClassGrade;

    @NotNull(message = "Entered date to N.W.P. Council is required")
    private LocalDate enteredDateToNWPCouncil;

    @NotBlank(message = "Permanent address is required")
    private String permanentAddress;

    private String residentDistrict;

    @NotBlank(message = "Contact number is required")
    private String contactNo;

    @NotNull(message = "Service level is required")
    private Long serviceLevelId;

    @NotNull(message = "Employment type is required")
    private EmploymentType employmentType;

    private String transferredFrom;

    private String remarks;

    private Boolean ebGrade3Passed;

    private Boolean languageQualificationPassed;

    private Boolean medicalReportCompleted;

    private Boolean olApproved;

    private Boolean alApproved;

    private Boolean degreeApproved;

    private String otherQualificationName;

    private Boolean otherQualificationApproved;

    private Boolean birthCertificateApproved;
}
