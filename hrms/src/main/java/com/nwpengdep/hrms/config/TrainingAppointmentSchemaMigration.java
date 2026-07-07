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
public class TrainingAppointmentSchemaMigration {

    private final JdbcTemplate jdbcTemplate;

    @EventListener(ApplicationReadyEvent.class)
    public void migrateTrainingAppointmentSchema() {
        try {
            ensureTrainingAppointmentColumn();
            backfillTrainingAppointmentFlags();
        } catch (Exception exception) {
            log.warn(
                    "Training appointment schema migration skipped: {}",
                    exception.getMessage()
            );
        }
    }

    private void ensureTrainingAppointmentColumn() {
        if (!tableExists("employee_actions")
                || columnExists("employee_actions", "training_appointment")) {
            return;
        }

        jdbcTemplate.execute(
                """
                        ALTER TABLE employee_actions
                        ADD COLUMN training_appointment BOOLEAN NOT NULL DEFAULT FALSE
                        """
        );
        log.info("Added employee_actions.training_appointment column");
    }

    private void backfillTrainingAppointmentFlags() {
        if (!tableExists("employee_actions")
                || !columnExists("employee_actions", "training_appointment")) {
            return;
        }

        int updated;
        if (tableExists("employee_training_profiles")) {
            updated = jdbcTemplate.update(
                    """
                            UPDATE employee_actions a
                            INNER JOIN employees e ON e.id = a.employee_id
                            INNER JOIN employee_training_profiles tp
                                    ON tp.employee_id = e.id
                                   AND tp.training_origin = TRUE
                            SET a.training_appointment = TRUE
                            WHERE a.action_type = 'NEW_APPOINTMENT'
                              AND COALESCE(a.training_graduation, FALSE) = FALSE
                              AND COALESCE(a.training_appointment, FALSE) = FALSE
                              AND (a.deleted IS NULL OR a.deleted = FALSE)
                              AND a.id = (
                                  SELECT MIN(a2.id)
                                  FROM employee_actions a2
                                  WHERE a2.employee_id = e.id
                                    AND a2.action_type = 'NEW_APPOINTMENT'
                                    AND COALESCE(a2.training_graduation, FALSE) = FALSE
                                    AND (a2.deleted IS NULL OR a2.deleted = FALSE)
                              )
                            """
            );
        } else if (columnExists("employees", "training_origin")) {
            updated = jdbcTemplate.update(
                    """
                            UPDATE employee_actions a
                            INNER JOIN employees e ON e.id = a.employee_id
                            SET a.training_appointment = TRUE
                            WHERE a.action_type = 'NEW_APPOINTMENT'
                              AND COALESCE(a.training_graduation, FALSE) = FALSE
                              AND COALESCE(a.training_appointment, FALSE) = FALSE
                              AND (a.deleted IS NULL OR a.deleted = FALSE)
                              AND e.training_origin = TRUE
                              AND a.id = (
                                  SELECT MIN(a2.id)
                                  FROM employee_actions a2
                                  WHERE a2.employee_id = e.id
                                    AND a2.action_type = 'NEW_APPOINTMENT'
                                    AND COALESCE(a2.training_graduation, FALSE) = FALSE
                                    AND (a2.deleted IS NULL OR a2.deleted = FALSE)
                              )
                            """
            );
        } else {
            return;
        }

        if (updated > 0) {
            log.info(
                    "Marked {} existing trainee appointment action(s) as training appointments",
                    updated
            );
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
