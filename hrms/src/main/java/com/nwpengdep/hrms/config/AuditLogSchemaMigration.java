package com.nwpengdep.hrms.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class AuditLogSchemaMigration {

    private final JdbcTemplate jdbcTemplate;

    @EventListener(ApplicationReadyEvent.class)
    public void migrateAuditLogSchema() {
        try {
            if (!tableExists("audit_logs")) {
                createAuditLogsTable();
                return;
            }

            addColumnIfMissing("audit_logs", "is_sensitive", "TINYINT(1) DEFAULT 0");
            addColumnIfMissing("audit_logs", "activity_summary", "VARCHAR(255)");
        } catch (Exception e) {
            log.warn("Audit log schema migration skipped: {}", e.getMessage());
        }
    }

    private void createAuditLogsTable() {
        jdbcTemplate.execute("""
                CREATE TABLE audit_logs (
                    id BIGINT AUTO_INCREMENT PRIMARY KEY,
                    occurred_at DATETIME(3) NOT NULL,
                    action VARCHAR(32) NOT NULL,
                    entity_type VARCHAR(64),
                    entity_id VARCHAR(64),
                    entity_label VARCHAR(255),
                    user_id BIGINT,
                    username VARCHAR(100) NOT NULL,
                    user_role VARCHAR(32) NOT NULL,
                    ip_address VARCHAR(45),
                    user_agent VARCHAR(512),
                    client_host VARCHAR(255),
                    http_method VARCHAR(10),
                    request_path VARCHAR(512),
                    correlation_id VARCHAR(36),
                    session_id VARCHAR(64),
                    status VARCHAR(16) NOT NULL,
                    failure_reason VARCHAR(500),
                    source_module VARCHAR(64),
                    export_format VARCHAR(16),
                    record_count INT,
                    is_sensitive TINYINT(1) DEFAULT 0,
                    activity_summary VARCHAR(255),
                    changed_fields JSON,
                    old_values JSON,
                    new_values JSON,
                    content_hash VARCHAR(64),
                    INDEX idx_occurred_at (occurred_at),
                    INDEX idx_username (username),
                    INDEX idx_action (action),
                    INDEX idx_entity (entity_type, entity_id),
                    INDEX idx_ip (ip_address)
                )
                """);
        log.info("Created audit_logs table");
    }

    private void addColumnIfMissing(
            String tableName,
            String columnName,
            String columnDefinition
    ) {
        if (!tableExists(tableName) || columnExists(tableName, columnName)) {
            return;
        }
        jdbcTemplate.execute(
                "ALTER TABLE " + tableName
                        + " ADD COLUMN " + columnName + " " + columnDefinition
        );
        log.info("Added {}.{}", tableName, columnName);
    }

    private boolean tableExists(String tableName) {
        Integer count = jdbcTemplate.queryForObject(
                """
                        SELECT COUNT(*)
                        FROM information_schema.TABLES
                        WHERE TABLE_SCHEMA = DATABASE()
                          AND TABLE_NAME = ?
                        """,
                Integer.class,
                tableName
        );
        return count != null && count > 0;
    }

    private boolean columnExists(String tableName, String columnName) {
        Integer count = jdbcTemplate.queryForObject(
                """
                        SELECT COUNT(*)
                        FROM information_schema.COLUMNS
                        WHERE TABLE_SCHEMA = DATABASE()
                          AND TABLE_NAME = ?
                          AND COLUMN_NAME = ?
                        """,
                Integer.class,
                tableName,
                columnName
        );
        return count != null && count > 0;
    }
}
