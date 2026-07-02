package com.nwpengdep.hrms.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "employee_career_progression")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmployeeCareerProgression {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false, unique = true)
    @JsonIgnore
    private Employee employee;

    @Column(nullable = false)
    @Builder.Default
    private Boolean qualifiedForPermanent = false;

    private LocalDate permanentQualificationDate;

    private LocalDate permanentConfirmationDate;

    private LocalDate grade3AchievedDate;

    private LocalDate grade2AchievedDate;

    private LocalDate grade1AchievedDate;

    private LocalDate supraAchievedDate;

    private LocalDate specialAchievedDate;

    private Integer grade2RequiredYears;

    private LocalDate grade2EligibilityDate;

    @Column(nullable = false)
    @Builder.Default
    private Boolean qualifiedForGrade2 = false;

    private Integer grade1RequiredYears;

    private LocalDate grade1EligibilityDate;

    @Column(nullable = false)
    @Builder.Default
    private Boolean qualifiedForGrade1 = false;

    private Integer supraRequiredYears;

    private LocalDate supraEligibilityDate;

    @Column(nullable = false)
    @Builder.Default
    private Boolean qualifiedForSupra = false;

    private Integer specialRequiredYears;

    private LocalDate specialEligibilityDate;

    @Column(nullable = false)
    @Builder.Default
    private Boolean qualifiedForSpecial = false;

    private String remarks;

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
