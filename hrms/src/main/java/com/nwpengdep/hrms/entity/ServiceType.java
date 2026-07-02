package com.nwpengdep.hrms.entity;

import jakarta.persistence.*;

import lombok.*;

import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "services")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ServiceType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String serviceCode;

    private String description;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(
            name = "service_allowed_grades",
            joinColumns = @JoinColumn(name = "service_id")
    )
    @Enumerated(EnumType.STRING)
    @Column(name = "grade")
    @Builder.Default
    private Set<Grade> allowedGrades = new HashSet<>();

    private Integer grade2RequiredYears;

    private Integer grade1RequiredYears;

    private Integer supraRequiredYears;

    private Integer specialRequiredYears;

    @OneToMany(
            mappedBy = "service",
            cascade = CascadeType.ALL,
            orphanRemoval = true,
            fetch = FetchType.EAGER
    )
    @Builder.Default
    private Set<ServicePermanentRequirement> permanentRequirements =
            new HashSet<>();

    @OneToMany(
            mappedBy = "service",
            cascade = CascadeType.ALL,
            orphanRemoval = true,
            fetch = FetchType.EAGER
    )
    @Builder.Default
    private Set<ServiceGrade2Requirement> grade2Requirements =
            new HashSet<>();

    @OneToMany(
            mappedBy = "service",
            cascade = CascadeType.ALL,
            orphanRemoval = true,
            fetch = FetchType.EAGER
    )
    @Builder.Default
    private Set<ServiceGrade1Requirement> grade1Requirements =
            new HashSet<>();

    @OneToMany(
            mappedBy = "service",
            cascade = CascadeType.ALL,
            orphanRemoval = true,
            fetch = FetchType.EAGER
    )
    @Builder.Default
    private Set<ServiceSupraRequirement> supraRequirements =
            new HashSet<>();

    @OneToMany(
            mappedBy = "service",
            cascade = CascadeType.ALL,
            orphanRemoval = true,
            fetch = FetchType.EAGER
    )
    @Builder.Default
    private Set<ServiceSpecialRequirement> specialRequirements =
            new HashSet<>();
}
