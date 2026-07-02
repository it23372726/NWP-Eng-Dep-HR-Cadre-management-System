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
public class HistoricalDesignationSchemaMigration {

    private final JdbcTemplate jdbcTemplate;

    @EventListener(ApplicationReadyEvent.class)
    public void migrateHistoricalDesignationSchema() {
        try {
            addColumnIfMissing(
                    "employee_actions",
                    "recorded_new_designation_name",
                    "VARCHAR(255)"
            );
            addColumnIfMissing(
                    "employees",
                    "recorded_designation_name",
                    "VARCHAR(255)"
            );
            addColumnIfMissing("employees", "service_id", "BIGINT");
            addForeignKeyIfMissing(
                    "employees",
                    "fk_employees_service",
                    "service_id",
                    "services",
                    "id"
            );
        } catch (Exception e) {
            log.warn(
                    "Historical designation schema migration skipped: {}",
                    e.getMessage()
            );
        }
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

    private void addForeignKeyIfMissing(
            String tableName,
            String constraintName,
            String columnName,
            String referencedTable,
            String referencedColumn
    ) {
        if (!tableExists(tableName) || !columnExists(tableName, columnName)) {
            return;
        }
        if (foreignKeyExists(tableName, constraintName)) {
            return;
        }
        jdbcTemplate.execute(
                "ALTER TABLE " + tableName
                        + " ADD CONSTRAINT " + constraintName
                        + " FOREIGN KEY (" + columnName + ")"
                        + " REFERENCES " + referencedTable + "(" + referencedColumn + ")"
        );
        log.info("Added foreign key {} on {}", constraintName, tableName);
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

    private boolean foreignKeyExists(String tableName, String constraintName) {
        Integer count = jdbcTemplate.queryForObject(
                """
                        SELECT COUNT(*)
                        FROM information_schema.TABLE_CONSTRAINTS
                        WHERE TABLE_SCHEMA = DATABASE()
                          AND TABLE_NAME = ?
                          AND CONSTRAINT_NAME = ?
                          AND CONSTRAINT_TYPE = 'FOREIGN KEY'
                        """,
                Integer.class,
                tableName,
                constraintName
        );
        return count != null && count > 0;
    }
}
