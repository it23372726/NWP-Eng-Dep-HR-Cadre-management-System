package com.nwpengdep.hrms.entity;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.persistence.Version;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(
        name = "salary_increment_records",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_salary_increment_legacy_key",
                        columnNames = "legacy_import_key"
                )
        },
        indexes = {
                @Index(name = "idx_sir_employee", columnList = "employee_id"),
                @Index(name = "idx_sir_employee_due_year", columnList = "employee_id, due_year"),
                @Index(name = "idx_sir_operation_id", columnList = "operation_id"),
                @Index(
                        name = "idx_sir_employee_status",
                        columnList = "employee_id, record_status"
                ),
                @Index(
                        name = "idx_sir_employee_recorded_at",
                        columnList = "employee_id, recorded_at"
                )
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SalaryIncrementRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "employee_id",
            nullable = false,
            foreignKey = @ForeignKey(name = "fk_salary_increment_employee")
    )
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Employee employee;

    @Column(name = "due_year", nullable = false)
    private Integer dueYear;

    @Column(length = 36)
    private String serviceAppointmentKey;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(name = "done_date")
    private LocalDate doneDate;

    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(name = "operation_id", nullable = false, length = 36)
    private UUID operationId;

    @Enumerated(EnumType.STRING)
    @Column(name = "operation_type", nullable = false, length = 32)
    private SalaryIncrementOperationType operationType;

    @Enumerated(EnumType.STRING)
    @Column(name = "record_status", nullable = false, length = 16)
    private SalaryIncrementRecordStatus recordStatus;

    @Column(name = "recorded_at", nullable = false)
    private LocalDateTime recordedAt;

    @Column(name = "recorded_by", length = 100)
    private String recordedBy;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "updated_by", length = 100)
    private String updatedBy;

    @Column(name = "reversed_at")
    private LocalDateTime reversedAt;

    @Column(name = "reversed_by", length = 100)
    private String reversedBy;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;

    @Column(name = "legacy_imported", nullable = false)
    @Builder.Default
    private boolean legacyImported = false;

    @Column(name = "legacy_import_key", length = 80)
    private String legacyImportKey;
}
