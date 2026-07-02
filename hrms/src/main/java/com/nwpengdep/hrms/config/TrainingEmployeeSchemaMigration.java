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
public class TrainingEmployeeSchemaMigration {

    private final JdbcTemplate jdbcTemplate;

    @EventListener(ApplicationReadyEvent.class)
    public void migrateTrainingEmployeeSchema() {
        try {
            ensureNullableEmploymentType();
            ensureNullablePermanentStatus();
            backfillTrainingEmployeeDepartments();
        } catch (Exception e) {
            log.warn(
                    "Training employee schema migration skipped: {}",
                    e.getMessage()
            );
        }
    }

    private void ensureNullableEmploymentType() {
        makeColumnNullableIfNeeded("employment_type");
    }

    private void ensureNullablePermanentStatus() {
        makeColumnNullableIfNeeded("permanent_status");
    }

    private void makeColumnNullableIfNeeded(String columnName) {
        if (!tableExists("employees") || !columnExists("employees", columnName)) {
            return;
        }

        String isNullable = jdbcTemplate.queryForObject(
                """
                        SELECT IS_NULLABLE
                        FROM information_schema.COLUMNS
                        WHERE TABLE_SCHEMA = DATABASE()
                          AND TABLE_NAME = 'employees'
                          AND COLUMN_NAME = ?
                        """,
                String.class,
                columnName
        );

        if ("YES".equalsIgnoreCase(isNullable)) {
            return;
        }

        jdbcTemplate.execute(
                "ALTER TABLE employees MODIFY COLUMN " + columnName + " VARCHAR(255) NULL"
        );
        log.info("Made employees.{} nullable for training employees", columnName);
    }

    private void backfillTrainingEmployeeDepartments() {
        if (!tableExists("employees") || !tableExists("service_levels")) {
            return;
        }

        int updated = jdbcTemplate.update(
                """
                        UPDATE employees e
                        INNER JOIN service_levels sl ON e.service_level_id = sl.id
                        SET e.current_department = 'N.W.P. Engineering Department',
                            e.current_office = COALESCE(
                                NULLIF(TRIM(e.current_office), ''),
                                NULLIF(TRIM(e.current_working_place), ''),
                                'Unknown'
                            ),
                            e.current_working_place = CONCAT(
                                'N.W.P. Engineering Department — ',
                                COALESCE(
                                    NULLIF(TRIM(e.current_office), ''),
                                    NULLIF(TRIM(e.current_working_place), ''),
                                    'Unknown'
                                )
                            )
                        WHERE e.employment_type IS NULL
                          AND LOWER(sl.level_name) = 'training'
                          AND (
                              e.current_department IS NULL
                              OR TRIM(e.current_department) = ''
                          )
                        """
        );

        if (updated > 0) {
            log.info("Backfilled department for {} training employee(s)", updated);
        }
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
