package com.nwpengdep.hrms.entity;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "employee_service_appointments", uniqueConstraints =
        @UniqueConstraint(name = "uk_employee_appointment_key", columnNames = {"employee_id", "appointment_key"}))
@Getter @Setter @NoArgsConstructor
public class EmployeeServiceAppointment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "employee_id", nullable = false)
    @JsonIgnore
    private Employee employee;
    @Column(name = "appointment_key", nullable = false, length = 36)
    private String appointmentKey;
    private Long serviceId;
    private String serviceCode;
    private Long entryDesignationId;
    private String entryDesignationName;
    private Long serviceLevelId;
    private LocalDate startDate;
    /** Exclusive boundary: the next appointment is effective on this date. */
    private LocalDate endDate;
    private LocalDate probationEndDate;
    private LocalDate permanentConfirmationDate;
    private LocalDate grade2AchievedDate;
    private LocalDate grade1AchievedDate;
    private LocalDate supraAchievedDate;
    private LocalDate specialAchievedDate;
    private String appointmentBasis;
    private String incrementDate;
    private LocalDate firstIncrementDueDate;
    private boolean currentAppointment;
    /** Replaced periods remain stored for audit and cannot affect eligibility. */
    private boolean superseded;
    /**
     * True only for rows created to preserve requirement results before a revision reassigned them.
     * These are not appointments the employee held, so they are kept even when unreachable from the
     * timeline, while a period orphaned by a deleted action is discarded.
     */
    private boolean archivedSnapshot;
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "service_appointment_requirements", joinColumns = @JoinColumn(name = "appointment_id"))
    @OrderColumn(name = "requirement_order")
    private List<ServiceAppointmentRequirement> requirements = new ArrayList<>();
}
