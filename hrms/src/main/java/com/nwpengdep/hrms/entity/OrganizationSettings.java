package com.nwpengdep.hrms.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "organization_settings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrganizationSettings {

    public static final long SINGLETON_ID = 1L;

    @Id
    private Long id;

    @Column(name = "primary_department_name", nullable = false, length = 255)
    private String primaryDepartmentName;

    @Column(name = "provincial_council_name", nullable = false, length = 255)
    private String provincialCouncilName;

    @Column(name = "department_short_name", nullable = false, length = 120)
    private String departmentShortName;

    @Column(name = "application_name", nullable = false, length = 120)
    private String applicationName;

    @Column(name = "council_label", nullable = false, length = 120)
    private String councilLabel;

    @Lob
    @Column(name = "districts_json", nullable = false, columnDefinition = "TEXT")
    private String districtsJson;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    @PreUpdate
    void touchUpdatedAt() {
        updatedAt = Instant.now();
        if (id == null) {
            id = SINGLETON_ID;
        }
    }
}
