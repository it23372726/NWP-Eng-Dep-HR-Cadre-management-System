package com.nwpengdep.hrms.service;

import com.nwpengdep.hrms.audit.AuditAction;
import com.nwpengdep.hrms.audit.AuditEventRequest;
import com.nwpengdep.hrms.audit.AuditSourceModule;
import com.nwpengdep.hrms.audit.AuditStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditLogRetentionService {

    private static final int RETENTION_YEARS = 7;

    private final AuditLogService auditLogService;

    @Scheduled(cron = "0 0 2 * * *")
    @Transactional
    public void purgeExpiredAuditLogs() {
        LocalDateTime cutoff = LocalDateTime.now().minusYears(RETENTION_YEARS);
        int deletedCount = auditLogService.purgeOlderThan(cutoff);

        if (deletedCount > 0) {
            log.info("Purged {} audit log records older than {}", deletedCount, cutoff);
            auditLogService.log(AuditEventRequest.builder()
                    .action(AuditAction.SYSTEM)
                    .entityType("AuditLog")
                    .entityLabel("Retention purge")
                    .sourceModule(AuditSourceModule.SYSTEM)
                    .status(AuditStatus.SUCCESS)
                    .usernameOverride("system")
                    .userRoleOverride("SYSTEM")
                    .newValues(Map.of(
                            "deletedCount", deletedCount,
                            "cutoff", cutoff.toString(),
                            "retentionYears", RETENTION_YEARS
                    ))
                    .build());
        }
    }
}
