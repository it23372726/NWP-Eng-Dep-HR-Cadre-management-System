package com.nwpengdep.hrms.dto;

import com.nwpengdep.hrms.entity.EmployeeStatus;
import com.nwpengdep.hrms.entity.EmploymentType;
import com.nwpengdep.hrms.entity.Grade;
import com.nwpengdep.hrms.entity.PermanentStatus;
import com.nwpengdep.hrms.entity.RequirementStatus;
import com.nwpengdep.hrms.entity.RequirementType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Slim employee payload for Active/Inactive list endpoints.
 * Field names match the full Employee JSON the list UI already reads.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmployeeListItemResponse {

    private Long id;
    private String employeeNo;
    private String fullName;
    private String nic;
    private EmployeeStatus status;
    private Grade grade;
    private EmploymentType employmentType;
    private PermanentStatus permanentStatus;
    private String profilePhotoPath;
    private LocalDate dateOfBirth;
    private LocalDate dateOfFirstAppointment;
    private LocalDate probationEndDate;
    private String contactNo;

    private String currentDepartment;
    private String currentOffice;
    private String currentWorkingPlace;
    private String currentDistrictOfWorking;
    private String recordedDesignationName;
    private String specialDesignationName;
    private String transferredFrom;

    private DesignationRef designation;
    private ServiceRef service;
    private ServiceLevelRef serviceLevel;
    private CareerProgressionRef careerProgression;

    @Builder.Default
    private List<RequirementRef> requirements = new ArrayList<>();

    private Boolean privateVehicleUsedForGovWork;
    private LocalDate privateVehicleExpireDate;
    private Boolean privateVehicleRented;
    private String incremantDate;
    private Integer salaryIncrementLastDueYear;
    private LocalDate salaryIncrementDoneDate;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DesignationRef {
        private Long id;
        private String designationName;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ServiceRef {
        private Long id;
        private String serviceCode;
        private String description;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ServiceLevelRef {
        private Long id;
        private String levelName;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CareerProgressionRef {
        private Boolean qualifiedForPermanent;
        private Boolean qualifiedForGrade2;
        private Boolean qualifiedForGrade1;
        private Boolean qualifiedForSupra;
        private Boolean qualifiedForSpecial;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RequirementRef {
        private RequirementType requirementType;
        private String requirementName;
        private RequirementStatus status;
    }
}
