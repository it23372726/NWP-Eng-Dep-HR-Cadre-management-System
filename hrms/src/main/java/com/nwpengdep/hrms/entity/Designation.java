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
}
