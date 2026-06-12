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
public class EmployeeActionSchemaMigration {

    private static final String PERMANENT_CONFIRMATION =
            "PERMANENT_CONFIRMATION";
    private static final String ASSIGNMENT_GRADE_UPDATE =
            "ASSIGNMENT_GRADE_UPDATE";

    private final JdbcTemplate jdbcTemplate;

    @EventListener(ApplicationReadyEvent.class)
    public void migrateEmployeeActionSchema() {
        try {
            ensurePermanentConfirmationActionType();
        } catch (Exception e) {
            log.warn(
                    "Employee action schema migration skipped: {}",
                    e.getMessage()
            );
        }
    }

    private void ensurePermanentConfirmationActionType() {
        if (!tableExists("employee_actions")
                || !columnExists("employee_actions", "action_type")) {
            return;
        }

        String columnType = jdbcTemplate.queryForObject(
                """
                        SELECT COLUMN_TYPE
                        FROM information_schema.COLUMNS
                        WHERE TABLE_SCHEMA = DATABASE()
                          AND TABLE_NAME = 'employee_actions'
                          AND COLUMN_NAME = 'action_type'
                        """,
                String.class
        );

        if (columnType == null || !columnType.toLowerCase().startsWith("enum(")) {
            return;
        }

        if (columnType.contains("'" + PERMANENT_CONFIRMATION + "'")
                && columnType.contains("'" + ASSIGNMENT_GRADE_UPDATE + "'")) {
            return;
        }

        jdbcTemplate.execute("""
                ALTER TABLE employee_actions
                MODIFY COLUMN action_type ENUM(
                    'NEW_APPOINTMENT',
                    'TRANSFER_IN',
                    'TRANSFER_OUT',
                    'PROMOTION',
                    'ASSIGNMENT_GRADE_UPDATE',
                    'PERMANENT_CONFIRMATION',
                    'RETIREMENT_OR_RESIGNATION',
                    'DEATH',
                    'DISMISSAL'
                ) NOT NULL
                """);
        log.info(
                "Ensured new lifecycle values exist in employee_actions.action_type enum"
        );
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
