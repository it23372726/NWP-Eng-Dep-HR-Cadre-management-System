package com.nwpengdep.hrms.service;

import com.nwpengdep.hrms.audit.AuditAction;
import com.nwpengdep.hrms.audit.AuditContext;
import com.nwpengdep.hrms.audit.AuditContextHolder;
import com.nwpengdep.hrms.audit.AuditDiffUtil;
import com.nwpengdep.hrms.audit.AuditEventRequest;
import com.nwpengdep.hrms.audit.AuditStatus;
import com.nwpengdep.hrms.dto.AuditLogResponse;
import com.nwpengdep.hrms.dto.AuditLogSearchRequest;
import com.nwpengdep.hrms.entity.AuditLog;
import com.nwpengdep.hrms.repository.AuditLogRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final CurrentUserService currentUserService;
    private final AuditDiffUtil auditDiffUtil;

    @Transactional
    public AuditLog log(AuditEventRequest request) {
        AuditContext context = AuditContextHolder.get();

        String username = request.getUsernameOverride() != null
                ? request.getUsernameOverride()
                : currentUserService.getCurrentUsernameOrDefault("anonymous");

        String userRole = request.getUserRoleOverride() != null
                ? request.getUserRoleOverride()
                : currentUserService.getCurrentUserRoleNameOrDefault("UNKNOWN");

        Long userId = currentUserService.getCurrentUserId().orElse(null);

        Map<String, Object> oldValues = request.getOldValues();
        Map<String, Object> newValues = request.getNewValues();
        List<String> changedFields = request.getChangedFields();
        if (changedFields == null && oldValues != null && newValues != null) {
            changedFields = auditDiffUtil.diffFields(oldValues, newValues);
        }

        AuditLog auditLog = AuditLog.builder()
                .occurredAt(LocalDateTime.now())
                .action(request.getAction())
                .entityType(request.getEntityType())
                .entityId(request.getEntityId())
                .entityLabel(request.getEntityLabel())
                .activitySummary(request.getActivitySummary())
                .userId(userId)
                .username(username)
                .userRole(userRole)
                .ipAddress(context != null ? context.getIpAddress() : null)
                .userAgent(context != null ? context.getUserAgent() : null)
                .clientHost(context != null ? context.getClientHost() : null)
                .httpMethod(context != null ? context.getHttpMethod() : null)
                .requestPath(context != null ? context.getRequestPath() : null)
                .correlationId(context != null ? context.getCorrelationId() : null)
                .sessionId(context != null ? context.getSessionId() : null)
                .status(request.getStatus() != null ? request.getStatus() : AuditStatus.SUCCESS)
                .failureReason(request.getFailureReason())
                .sourceModule(request.getSourceModule())
                .exportFormat(request.getExportFormat())
                .recordCount(request.getRecordCount())
                .sensitive(request.getSensitive() != null ? request.getSensitive() : false)
                .changedFields(changedFields)
                .oldValues(oldValues)
                .newValues(newValues)
                .contentHash(auditDiffUtil.computeContentHash(oldValues, newValues))
                .build();

        return auditLogRepository.save(auditLog);
    }

    @Transactional(readOnly = true)
    public Page<AuditLogResponse> search(AuditLogSearchRequest request) {
        Specification<AuditLog> specification = buildSpecification(request);
        PageRequest pageRequest = PageRequest.of(
                request.getPage(),
                request.getSize(),
                Sort.by(Sort.Direction.DESC, "occurredAt", "id")
        );
        return auditLogRepository.findAll(specification, pageRequest)
                .map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public AuditLogResponse getById(Long id) {
        return auditLogRepository.findById(id)
                .map(this::toResponse)
                .orElseThrow(() -> new RuntimeException("Audit log not found"));
    }

    @Transactional
    public int purgeOlderThan(LocalDateTime cutoff) {
        return auditLogRepository.deleteOlderThan(cutoff);
    }

    private Specification<AuditLog> buildSpecification(AuditLogSearchRequest request) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (request.getUsername() != null && !request.getUsername().isBlank()) {
                predicates.add(cb.like(
                        cb.lower(root.get("username")),
                        "%" + request.getUsername().toLowerCase() + "%"
                ));
            }

            if (request.getAction() != null) {
                predicates.add(cb.equal(root.get("action"), request.getAction()));
            }

            if (request.getSourceModule() != null) {
                predicates.add(cb.equal(root.get("sourceModule"), request.getSourceModule()));
            }

            if (request.getStatus() != null) {
                predicates.add(cb.equal(root.get("status"), request.getStatus()));
            }

            if (request.getEntityType() != null && !request.getEntityType().isBlank()) {
                predicates.add(cb.equal(root.get("entityType"), request.getEntityType()));
            }

            if (request.getEntityId() != null && !request.getEntityId().isBlank()) {
                predicates.add(cb.equal(root.get("entityId"), request.getEntityId()));
            }

            if (request.getIpAddress() != null && !request.getIpAddress().isBlank()) {
                predicates.add(cb.like(root.get("ipAddress"), "%" + request.getIpAddress() + "%"));
            }

            if (request.getSensitive() != null) {
                predicates.add(cb.equal(root.get("sensitive"), request.getSensitive()));
            }

            if (request.getFrom() != null) {
                LocalDateTime from = request.getFrom().atStartOfDay();
                predicates.add(cb.greaterThanOrEqualTo(root.get("occurredAt"), from));
            }

            if (request.getTo() != null) {
                LocalDateTime to = request.getTo().atTime(LocalTime.MAX);
                predicates.add(cb.lessThanOrEqualTo(root.get("occurredAt"), to));
            }

            if (request.getSearch() != null && !request.getSearch().isBlank()) {
                String pattern = "%" + request.getSearch().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("entityLabel")), pattern),
                        cb.like(cb.lower(root.get("requestPath")), pattern),
                        cb.like(cb.lower(root.get("username")), pattern)
                ));
            }

            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }

    private AuditLogResponse toResponse(AuditLog auditLog) {
        return AuditLogResponse.builder()
                .id(auditLog.getId())
                .occurredAt(auditLog.getOccurredAt())
                .action(auditLog.getAction())
                .entityType(auditLog.getEntityType())
                .entityId(auditLog.getEntityId())
                .entityLabel(auditLog.getEntityLabel())
                .activitySummary(auditLog.getActivitySummary())
                .username(auditLog.getUsername())
                .userRole(auditLog.getUserRole())
                .ipAddress(auditLog.getIpAddress())
                .userAgent(auditLog.getUserAgent())
                .clientHost(auditLog.getClientHost())
                .httpMethod(auditLog.getHttpMethod())
                .requestPath(auditLog.getRequestPath())
                .correlationId(auditLog.getCorrelationId())
                .status(auditLog.getStatus())
                .failureReason(auditLog.getFailureReason())
                .sourceModule(auditLog.getSourceModule())
                .exportFormat(auditLog.getExportFormat())
                .recordCount(auditLog.getRecordCount())
                .sensitive(auditLog.getSensitive())
                .changedFields(auditLog.getChangedFields())
                .oldValues(auditLog.getOldValues())
                .newValues(auditLog.getNewValues())
                .contentHash(auditLog.getContentHash())
                .build();
    }
}
