package com.nwpengdep.hrms.dto;

import com.nwpengdep.hrms.entity.District;
import com.nwpengdep.hrms.entity.EmploymentType;
import com.nwpengdep.hrms.entity.Grade;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class EmployeeUpdateRequest {

    @NotBlank(message = "Employee number is required")
    private String employeeNo;

    @NotBlank(message = "Name is required")
    private String fullName;

    private Long designationId;

    @NotBlank(message = "NIC is required")
    private String nic;

    private String tin;

    @NotNull(message = "Date of birth is required")
    private LocalDate dateOfBirth;

    @NotBlank(message = "Gender is required")
    private String gender;

    private String maritalStatus;

    private Grade grade;

    private LocalDate dateOfFirstAppointment;

    private String incremantDate;

    private String widowsOrphansPensionNo;

    private LocalDate enteredDateToAllIslandService;

    @NotNull(message = "Reported date to present working place is required")
    private LocalDate reportedDateToPresentWorkingPlace;

    @NotBlank(message = "Current working place is required")
    private String currentWorkingPlace;

    private String currentDepartment;

    private District currentDistrictOfWorking;

    private LocalDate appointmentDateToPresentClassGrade;

    private LocalDate enteredDateToNWPCouncil;

    @NotBlank(message = "Permanent address is required")
    private String permanentAddress;

    private String residentDistrict;

    private Boolean privateVehicleUsedForGovWork;

    private String privateVehicleDescription;

    private LocalDate privateVehiclePermissionDate;

    private LocalDate privateVehicleExpireDate;

    private String privateVehicleInsuranceNumber;

    private String privateVehicleLicensePlateNumber;

    private Boolean privateVehicleRented;

    private String privateVehicleRentedFrom;

    @NotBlank(message = "Contact number is required")
    private String contactNo;

    private String emailAddress;

    private Long serviceLevelId;

    private Integer trainingPeriodYears;

    private EmploymentType employmentType;

    private LocalDate contractStartDate;

    private LocalDate contractEndDate;

    private Boolean ebGrade3Passed;

    private Boolean languageQualificationPassed;

    private Boolean medicalReportCompleted;

    private Boolean olApproved;

    private Boolean alApproved;

    private Boolean degreeApproved;

    private String otherQualificationName;

    private Boolean otherQualificationApproved;

    private Boolean birthCertificateApproved;

    private Boolean alreadyConfirmedPermanent;

    private LocalDate permanentConfirmationDate;

    private Boolean ebGrade2Passed;

    private Boolean otherGrade2RequirementCompleted;

    private Integer grade2RequiredYears;

    private Integer grade1RequiredYears;

    private List<EmployeeRequirementRequest> requirements;

    private List<CareerHistoryEventRequest> careerHistory;

    private Boolean qualificationUpdateOnly;

    private EmployeeSpouseRequest spouse;

    private List<EmployeeChildRequest> children;
}
