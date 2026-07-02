package com.nwpengdep.hrms.entity;

import com.nwpengdep.hrms.audit.AuditAction;
import com.nwpengdep.hrms.audit.AuditSourceModule;
import com.nwpengdep.hrms.audit.AuditStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "audit_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDateTime occurredAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private AuditAction action;

    @Column(length = 64)
    private String entityType;

    @Column(length = 64)
    private String entityId;

    @Column(length = 255)
    private String entityLabel;

    @Column(length = 255)
    private String activitySummary;

    private Long userId;

    @Column(nullable = false, length = 100)
    private String username;

    @Column(nullable = false, length = 32)
    private String userRole;

    @Column(length = 45)
    private String ipAddress;

    @Column(length = 512)
    private String userAgent;

    @Column(length = 255)
    private String clientHost;

    @Column(length = 10)
    private String httpMethod;

    @Column(length = 512)
    private String requestPath;

    @Column(length = 36)
    private String correlationId;

    @Column(length = 64)
    private String sessionId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private AuditStatus status;

    @Column(length = 500)
    private String failureReason;

    @Enumerated(EnumType.STRING)
    @Column(length = 64)
    private AuditSourceModule sourceModule;

    @Column(length = 16)
    private String exportFormat;

    private Integer recordCount;

    @Builder.Default
    @Column(name = "is_sensitive")
    private Boolean sensitive = false;

    @JdbcTypeCode(SqlTypes.JSON)
    private List<String> changedFields;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> oldValues;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> newValues;

    @Column(length = 64)
    private String contentHash;
}
