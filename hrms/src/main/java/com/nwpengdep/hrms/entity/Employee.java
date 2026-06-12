package com.nwpengdep.hrms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

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

    @Column(unique = true)
    private String nic;

    private LocalDate dateOfBirth;

    private String gender;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Grade grade;

    private LocalDate dateOfFirstAppointment;

    private LocalDate enteredDateToAllIslandService;

    private LocalDate reportedDateToPresentWorkingPlace;

    private String currentWorkingPlace;

    @Enumerated(EnumType.STRING)
    private District currentDistrictOfWorking;

    private LocalDate appointmentDateToPresentClassGrade;

    private LocalDate enteredDateToNWPCouncil;

    private String permanentAddress;

    private String residentDistrict;

    private String incremantDate;

    private String contactNo;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "service_level_id", nullable = false)
    private ServiceLevel serviceLevel;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private EmployeeStatus status = EmployeeStatus.ACTIVE;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private EmploymentType employmentType = EmploymentType.PERMANENT;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private PermanentStatus permanentStatus = PermanentStatus.PROBATION;

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

    private String transferredFrom;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
