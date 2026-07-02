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
public class TrainingGraduationSchemaMigration {

    private final JdbcTemplate jdbcTemplate;

    @EventListener(ApplicationReadyEvent.class)
    public void migrateTrainingGraduationSchema() {
        try {
            ensureTrainingOriginColumn();
            ensureTrainingPeriodYearsColumn();
            ensureTrainingRevertSnapshotColumn();
            ensureTrainingGraduationActionColumn();
            backfillTrainingOrigin();
            backfillTrainingPeriodYears();
        } catch (Exception exception) {
            log.warn(
                    "Training graduation schema migration skipped: {}",
                    exception.getMessage()
            );
        }
    }

    private void ensureTrainingOriginColumn() {
        if (!tableExists("employees")
                || columnExists("employees", "training_origin")) {
            return;
        }

        jdbcTemplate.execute(
                """
                        ALTER TABLE employees
                        ADD COLUMN training_origin BOOLEAN NOT NULL DEFAULT FALSE
                        """
        );
        log.info("Added employees.training_origin column");
    }

    private void ensureTrainingPeriodYearsColumn() {
        if (!tableExists("employees")
                || columnExists("employees", "training_period_years")) {
            return;
        }

        jdbcTemplate.execute(
                """
                        ALTER TABLE employees
                        ADD COLUMN training_period_years INT NULL
                        """
        );
        log.info("Added employees.training_period_years column");
    }

    private void ensureTrainingRevertSnapshotColumn() {
        if (!tableExists("employees")
                || columnExists("employees", "training_revert_snapshot")) {
            return;
        }

        jdbcTemplate.execute(
                """
                        ALTER TABLE employees
                        ADD COLUMN training_revert_snapshot TEXT NULL
                        """
        );
        log.info("Added employees.training_revert_snapshot column");
    }

    private void ensureTrainingGraduationActionColumn() {
        if (!tableExists("employee_actions")
                || columnExists("employee_actions", "training_graduation")) {
            return;
        }

        jdbcTemplate.execute(
                """
                        ALTER TABLE employee_actions
                        ADD COLUMN training_graduation BOOLEAN NOT NULL DEFAULT FALSE
                        """
        );
        log.info("Added employee_actions.training_graduation column");
    }

    private void backfillTrainingPeriodYears() {
        if (!tableExists("employees")
                || !columnExists("employees", "training_period_years")
                || !tableExists("service_levels")) {
            return;
        }

        int updated = jdbcTemplate.update(
                """
                        UPDATE employees e
                        INNER JOIN service_levels sl ON e.service_level_id = sl.id
                        SET e.training_period_years = 1
                        WHERE e.training_period_years IS NULL
                          AND e.employment_type IS NULL
                          AND LOWER(sl.level_name) = 'training'
                        """
        );

        if (updated > 0) {
            log.info(
                    "Defaulted training period to 1 year for {} existing trainee(s)",
                    updated
            );
        }
    }

    private void backfillTrainingOrigin() {
        if (!tableExists("employees") || !tableExists("service_levels")) {
            return;
        }

        int updated = jdbcTemplate.update(
                """
                        UPDATE employees e
                        INNER JOIN service_levels sl ON e.service_level_id = sl.id
                        SET e.training_origin = TRUE
                        WHERE e.training_origin = FALSE
                          AND e.employment_type IS NULL
                          AND LOWER(sl.level_name) = 'training'
                        """
        );

        if (updated > 0) {
            log.info("Marked {} existing training employee(s) as training origin", updated);
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
