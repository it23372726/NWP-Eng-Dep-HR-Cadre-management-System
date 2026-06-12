package com.nwpengdep.hrms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "designations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Designation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String designationName;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "service_id", nullable = false)
    private ServiceType service;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "service_level_id", nullable = false)
    private ServiceLevel serviceLevel;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(
            name = "designation_allowed_grades",
            joinColumns = @JoinColumn(name = "designation_id")
    )
    @Enumerated(EnumType.STRING)
    @Column(name = "grade")
    @Builder.Default
    private Set<Grade> allowedGrades = new HashSet<>();

    private String salaryCode;

    private Integer grade2RequiredYears;

    private Integer grade1RequiredYears;

    @OneToMany(
            mappedBy = "designation",
            cascade = CascadeType.ALL,
            orphanRemoval = true,
            fetch = FetchType.EAGER
    )
    @Builder.Default
    private Set<DesignationPermanentRequirement> permanentRequirements =
            new HashSet<>();

    @OneToMany(
            mappedBy = "designation",
            cascade = CascadeType.ALL,
            orphanRemoval = true,
            fetch = FetchType.EAGER
    )
    @Builder.Default
    private Set<DesignationGrade2Requirement> grade2Requirements =
            new HashSet<>();

    @OneToMany(
            mappedBy = "designation",
            cascade = CascadeType.ALL,
            orphanRemoval = true,
            fetch = FetchType.EAGER
    )
    @Builder.Default
    private Set<DesignationGrade1Requirement> grade1Requirements =
            new HashSet<>();
}
