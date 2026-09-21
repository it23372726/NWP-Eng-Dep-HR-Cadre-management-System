package com.nwpengdep.hrms.entity;

import java.time.LocalDate;
import jakarta.persistence.*;
import lombok.*;

/** A requirement result belongs to one appointment, even when another service uses the same name. */
@Embeddable
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ServiceAppointmentRequirement {
    @Enumerated(EnumType.STRING)
    @Column(length = 80)
    private RequirementType requirementType;
    private String requirementName;
    @Enumerated(EnumType.STRING)
    private RequirementStatus status;
    private LocalDate completedDate;
    private String remarks;
}
