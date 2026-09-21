package com.nwpengdep.hrms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "employee_actions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmployeeAction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EmployeeActionType actionType;

    @Column(nullable = false)
    private LocalDate actionDate;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "old_designation_id")
    private Designation oldDesignation;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "new_designation_id")
    private Designation newDesignation;

    @Column(name = "recorded_new_designation_name")
    private String recordedNewDesignationName;

    @Column(name = "recorded_special_designation_name")
    private String recordedSpecialDesignationName;

    /**
     * Distinguishes "HR set the special designation on this action" from actions recorded before the
     * field existed. Without it, replaying an older office change would clear a name it never touched.
     */
    private Boolean specialDesignationUpdated;

    @Enumerated(EnumType.STRING)
    private Grade oldGrade;

    @Enumerated(EnumType.STRING)
    private Grade newGrade;

    private String transferredFrom;

    private String transferredTo;

    private String department;

    private String office;

    private String fromDepartment;

    private String fromOffice;

    private String toDepartment;

    private String toOffice;

    @Column(length = 100)
    private String district;

    private Long linkedActionId;

    private String reason;

    private String remarks;

    @Column(length = 36)
    private String serviceAppointmentKey;
    private Long serviceId;
    private Long serviceLevelId;
    private String appointmentBasis;
    private String incrementDate;
    private LocalDate firstIncrementDueDate;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    private String editedBy;

    private LocalDateTime editedAt;

    private Boolean deleted;

    @Column(name = "training_graduation", nullable = false)
    @Builder.Default
    private Boolean trainingGraduation = false;

    @Column(name = "training_appointment", nullable = false)
    @Builder.Default
    private Boolean trainingAppointment = false;

    private String deletedBy;

    private LocalDateTime deletedAt;

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
