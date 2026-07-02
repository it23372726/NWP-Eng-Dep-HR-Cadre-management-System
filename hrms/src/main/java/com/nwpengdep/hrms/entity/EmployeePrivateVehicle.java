package com.nwpengdep.hrms.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "employee_private_vehicles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmployeePrivateVehicle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false, unique = true)
    @JsonIgnore
    private Employee employee;

    @Column(name = "used_for_gov_work")
    private Boolean usedForGovWork;

    @Column(name = "description", length = 512)
    private String description;

    @Column(name = "permission_date")
    private LocalDate permissionDate;

    @Column(name = "expire_date")
    private LocalDate expireDate;

    @Column(name = "insurance_number")
    private String insuranceNumber;

    @Column(name = "license_plate_number")
    private String licensePlateNumber;

    private Boolean rented;

    @Column(name = "rented_from")
    private String rentedFrom;

    @Column(name = "permit_collected_date")
    private LocalDate permitCollectedDate;

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
