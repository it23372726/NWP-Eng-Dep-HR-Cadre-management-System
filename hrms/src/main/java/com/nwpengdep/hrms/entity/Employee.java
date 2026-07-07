package com.nwpengdep.hrms.entity;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PostLoad;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "employees")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Employee {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String employeeNo;

    private String fullName;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "designation_id")
    private Designation designation;

    @Column(name = "recorded_designation_name")
    private String recordedDesignationName;

    @Column(name = "special_designation_name")
    private String specialDesignationName;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "service_id")
    private ServiceType service;

    @Column(unique = true)
    private String nic;

    private String tin;

    private LocalDate dateOfBirth;

    private String gender;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Grade grade;

    private LocalDate dateOfFirstAppointment;

    private LocalDate enteredDateToAllIslandService;

    private LocalDate reportedDateToPresentWorkingPlace;

    private String currentWorkingPlace;

    private String currentDepartment;

    private String currentOffice;

    @Enumerated(EnumType.STRING)
    private District currentDistrictOfWorking;

    private LocalDate appointmentDateToPresentClassGrade;

    private LocalDate enteredDateToNWPCouncil;

    private LocalDate contractStartDate;

    private LocalDate contractEndDate;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "service_level_id")
    private ServiceLevel serviceLevel;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private EmployeeStatus status = EmployeeStatus.ACTIVE;

    @Enumerated(EnumType.STRING)
    private EmploymentType employmentType;

    @Enumerated(EnumType.STRING)
    private PermanentStatus permanentStatus;

    @OneToOne(
            mappedBy = "employee",
            cascade = CascadeType.ALL,
            orphanRemoval = true,
            fetch = FetchType.EAGER
    )
    @Getter(AccessLevel.NONE)
    @Setter(AccessLevel.NONE)
    @JsonIgnore
    private EmployeeContactDetails contactDetails;

    @OneToOne(
            mappedBy = "employee",
            cascade = CascadeType.ALL,
            orphanRemoval = true,
            fetch = FetchType.EAGER
    )
    @Getter(AccessLevel.NONE)
    @Setter(AccessLevel.NONE)
    @JsonIgnore
    private EmployeePrivateVehicle privateVehicle;

    @OneToOne(
            mappedBy = "employee",
            cascade = CascadeType.ALL,
            orphanRemoval = true,
            fetch = FetchType.EAGER
    )
    @Getter(AccessLevel.NONE)
    @Setter(AccessLevel.NONE)
    @JsonIgnore
    private EmployeeBenefits benefits;

    @OneToOne(
            mappedBy = "employee",
            cascade = CascadeType.ALL,
            orphanRemoval = true,
            fetch = FetchType.EAGER
    )
    @Getter(AccessLevel.NONE)
    @Setter(AccessLevel.NONE)
    @JsonIgnore
    private EmployeeTrainingProfile trainingProfile;

    @OneToOne(
            mappedBy = "employee",
            cascade = CascadeType.ALL,
            orphanRemoval = true,
            fetch = FetchType.EAGER
    )
    private EmployeeCareerProgression careerProgression;

    @OneToMany(
            mappedBy = "employee",
            cascade = CascadeType.ALL,
            orphanRemoval = true,
            fetch = FetchType.EAGER
    )
    @Builder.Default
    private List<EmployeeRequirement> requirements = new ArrayList<>();

    @OneToOne(
            mappedBy = "employee",
            cascade = CascadeType.ALL,
            orphanRemoval = true,
            fetch = FetchType.EAGER
    )
    private EmployeeSpouse spouse;

    @OneToMany(
            mappedBy = "employee",
            cascade = CascadeType.ALL,
            orphanRemoval = true,
            fetch = FetchType.EAGER
    )
    @OrderBy("id ASC")
    @Builder.Default
    private List<EmployeeChild> children = new ArrayList<>();

    private String transferredFrom;

    @Column(name = "profile_photo_path", length = 512)
    private String profilePhotoPath;

    @Transient
    private Boolean canRevertTrainingGraduation;

    @Transient
    private Boolean canAppointAsPermanent;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PostLoad
    void ensureNormalizedChildRows() {
        if (id == null) {
            return;
        }
        if (contactDetails == null) {
            contactDetails = EmployeeContactDetails.builder().employee(this).build();
        }
        if (privateVehicle == null) {
            privateVehicle = EmployeePrivateVehicle.builder().employee(this).build();
        }
        if (benefits == null) {
            benefits = EmployeeBenefits.builder().employee(this).build();
        }
        if (trainingProfile == null) {
            trainingProfile = EmployeeTrainingProfile.builder()
                    .employee(this)
                    .trainingOrigin(false)
                    .build();
        }
    }

    public String getMaritalStatus() {
        return contactDetails != null ? contactDetails.getMaritalStatus() : null;
    }

    public void setMaritalStatus(String maritalStatus) {
        ensureContactDetails().setMaritalStatus(maritalStatus);
    }

    public String getPermanentAddress() {
        return contactDetails != null ? contactDetails.getPermanentAddress() : null;
    }

    public void setPermanentAddress(String permanentAddress) {
        ensureContactDetails().setPermanentAddress(permanentAddress);
    }

    public String getResidentDistrict() {
        return contactDetails != null ? contactDetails.getResidentDistrict() : null;
    }

    public void setResidentDistrict(String residentDistrict) {
        ensureContactDetails().setResidentDistrict(residentDistrict);
    }

    public String getContactNo() {
        return contactDetails != null ? contactDetails.getContactNo() : null;
    }

    public void setContactNo(String contactNo) {
        ensureContactDetails().setContactNo(contactNo);
    }

    public String getEmailAddress() {
        return contactDetails != null ? contactDetails.getEmailAddress() : null;
    }

    public void setEmailAddress(String emailAddress) {
        ensureContactDetails().setEmailAddress(emailAddress);
    }

    public Boolean getPrivateVehicleUsedForGovWork() {
        return privateVehicle != null ? privateVehicle.getUsedForGovWork() : null;
    }

    public void setPrivateVehicleUsedForGovWork(Boolean usedForGovWork) {
        ensurePrivateVehicle().setUsedForGovWork(usedForGovWork);
    }

    public String getPrivateVehicleDescription() {
        return privateVehicle != null ? privateVehicle.getDescription() : null;
    }

    public void setPrivateVehicleDescription(String description) {
        ensurePrivateVehicle().setDescription(description);
    }

    public LocalDate getPrivateVehiclePermissionDate() {
        return privateVehicle != null ? privateVehicle.getPermissionDate() : null;
    }

    public void setPrivateVehiclePermissionDate(LocalDate permissionDate) {
        ensurePrivateVehicle().setPermissionDate(permissionDate);
    }

    public LocalDate getPrivateVehicleExpireDate() {
        return privateVehicle != null ? privateVehicle.getExpireDate() : null;
    }

    public void setPrivateVehicleExpireDate(LocalDate expireDate) {
        ensurePrivateVehicle().setExpireDate(expireDate);
    }

    public String getPrivateVehicleInsuranceNumber() {
        return privateVehicle != null ? privateVehicle.getInsuranceNumber() : null;
    }

    public void setPrivateVehicleInsuranceNumber(String insuranceNumber) {
        ensurePrivateVehicle().setInsuranceNumber(insuranceNumber);
    }

    public String getPrivateVehicleLicensePlateNumber() {
        return privateVehicle != null ? privateVehicle.getLicensePlateNumber() : null;
    }

    public void setPrivateVehicleLicensePlateNumber(String licensePlateNumber) {
        ensurePrivateVehicle().setLicensePlateNumber(licensePlateNumber);
    }

    public Boolean getPrivateVehicleRented() {
        return privateVehicle != null ? privateVehicle.getRented() : null;
    }

    public void setPrivateVehicleRented(Boolean rented) {
        ensurePrivateVehicle().setRented(rented);
    }

    public String getPrivateVehicleRentedFrom() {
        return privateVehicle != null ? privateVehicle.getRentedFrom() : null;
    }

    public void setPrivateVehicleRentedFrom(String rentedFrom) {
        ensurePrivateVehicle().setRentedFrom(rentedFrom);
    }

    public LocalDate getVehiclePermitCollectedDate() {
        return privateVehicle != null ? privateVehicle.getPermitCollectedDate() : null;
    }

    public void setVehiclePermitCollectedDate(LocalDate permitCollectedDate) {
        ensurePrivateVehicle().setPermitCollectedDate(permitCollectedDate);
    }

    public String getIncremantDate() {
        return benefits != null ? benefits.getIncremantDate() : null;
    }

    public void setIncremantDate(String incremantDate) {
        ensureBenefits().setIncremantDate(incremantDate);
    }

    public String getWidowsOrphansPensionNo() {
        return benefits != null ? benefits.getWidowsOrphansPensionNo() : null;
    }

    public void setWidowsOrphansPensionNo(String widowsOrphansPensionNo) {
        ensureBenefits().setWidowsOrphansPensionNo(widowsOrphansPensionNo);
    }

    public Integer getSalaryIncrementLastDueYear() {
        return benefits != null ? benefits.getSalaryIncrementLastDueYear() : null;
    }

    public void setSalaryIncrementLastDueYear(Integer salaryIncrementLastDueYear) {
        ensureBenefits().setSalaryIncrementLastDueYear(salaryIncrementLastDueYear);
    }

    public Integer getSalaryIncrementPriorDueYear() {
        return benefits != null ? benefits.getSalaryIncrementPriorDueYear() : null;
    }

    public void setSalaryIncrementPriorDueYear(Integer salaryIncrementPriorDueYear) {
        ensureBenefits().setSalaryIncrementPriorDueYear(salaryIncrementPriorDueYear);
    }

    public LocalDate getSalaryIncrementDoneDate() {
        return benefits != null ? benefits.getSalaryIncrementDoneDate() : null;
    }

    public void setSalaryIncrementDoneDate(LocalDate salaryIncrementDoneDate) {
        ensureBenefits().setSalaryIncrementDoneDate(salaryIncrementDoneDate);
    }

    public Integer getTrainingPeriodYears() {
        return trainingProfile != null ? trainingProfile.getTrainingPeriodYears() : null;
    }

    public void setTrainingPeriodYears(Integer trainingPeriodYears) {
        ensureTrainingProfile().setTrainingPeriodYears(trainingPeriodYears);
    }

    public Boolean getTrainingOrigin() {
        return trainingProfile != null ? trainingProfile.getTrainingOrigin() : null;
    }

    public void setTrainingOrigin(Boolean trainingOrigin) {
        ensureTrainingProfile().setTrainingOrigin(
                trainingOrigin != null ? trainingOrigin : false
        );
    }

    public String getTrainingRevertSnapshot() {
        return trainingProfile != null ? trainingProfile.getTrainingRevertSnapshot() : null;
    }

    public void setTrainingRevertSnapshot(String trainingRevertSnapshot) {
        ensureTrainingProfile().setTrainingRevertSnapshot(trainingRevertSnapshot);
    }

    public EmployeeContactDetails ensureContactDetails() {
        if (contactDetails == null) {
            contactDetails = EmployeeContactDetails.builder().employee(this).build();
        }
        return contactDetails;
    }

    public EmployeePrivateVehicle ensurePrivateVehicle() {
        if (privateVehicle == null) {
            privateVehicle = EmployeePrivateVehicle.builder().employee(this).build();
        }
        return privateVehicle;
    }

    public EmployeeBenefits ensureBenefits() {
        if (benefits == null) {
            benefits = EmployeeBenefits.builder().employee(this).build();
        }
        return benefits;
    }

    public EmployeeTrainingProfile ensureTrainingProfile() {
        if (trainingProfile == null) {
            trainingProfile = EmployeeTrainingProfile.builder()
                    .employee(this)
                    .trainingOrigin(false)
                    .build();
        }
        return trainingProfile;
    }

    @PrePersist
    public void prePersist() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        ensureNormalizedChildRows();
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
