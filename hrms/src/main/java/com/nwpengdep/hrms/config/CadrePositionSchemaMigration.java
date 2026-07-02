package com.nwpengdep.hrms.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class CadrePositionSchemaMigration {

    private final JdbcTemplate jdbcTemplate;

    @EventListener(ApplicationReadyEvent.class)
    @Order(1)
    public void migrateCadreConstraints() {
        try {
            migrateCadrePositionsTable();
            dropEmployeeServiceColumnIfPresent();
            ensureEmployeeStatusColumn();
        } catch (Exception e) {
            log.warn(
                    "Cadre position schema migration skipped: {}",
                    e.getMessage()
            );
        }
    }

    private void migrateCadrePositionsTable() {
        if (!tableExists("cadre_positions")) {
            return;
        }

        dropObsoleteCadreIndexes();
        dropCadreServiceColumnIfPresent();
        ensureDesignationOnlyUnique();
        ensureDisplayOrderColumn();
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

    private void dropObsoleteCadreIndexes() {
        List<Map<String, Object>> indexes = jdbcTemplate.queryForList("""
                SELECT INDEX_NAME,
                       GROUP_CONCAT(
                           COLUMN_NAME
                           ORDER BY SEQ_IN_INDEX
                       ) AS columns
                FROM information_schema.STATISTICS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'cadre_positions'
                  AND NON_UNIQUE = 0
                  AND INDEX_NAME <> 'PRIMARY'
                GROUP BY INDEX_NAME
                """);

        for (Map<String, Object> index : indexes) {
            String columns = (String) index.get("columns");
            String indexName = (String) index.get("INDEX_NAME");

            if ("designation_id".equals(columns)
                    || "designation_id,service_id".equals(columns)) {
                jdbcTemplate.execute(
                        "ALTER TABLE cadre_positions DROP INDEX `"
                                + indexName + "`"
                );
                log.info(
                        "Dropped obsolete unique index '{}' on cadre_positions",
                        indexName
                );
            }
        }
    }

    private void dropCadreServiceColumnIfPresent() {
        Integer columnCount = jdbcTemplate.queryForObject(
                """
                        SELECT COUNT(*)
                        FROM information_schema.COLUMNS
                        WHERE TABLE_SCHEMA = DATABASE()
                          AND TABLE_NAME = 'cadre_positions'
                          AND COLUMN_NAME = 'service_id'
                        """,
                Integer.class
        );

        if (columnCount != null && columnCount > 0) {
            try {
                jdbcTemplate.execute(
                        "ALTER TABLE cadre_positions DROP COLUMN service_id"
                );
                log.info("Dropped service_id column from cadre_positions");
            } catch (Exception e) {
                log.warn(
                        "Could not drop cadre_positions.service_id: {}",
                        e.getMessage()
                );
            }
        }
    }

    private void dropEmployeeServiceColumnIfPresent() {
        if (!tableExists("employees")) {
            return;
        }

        Integer columnCount = jdbcTemplate.queryForObject(
                """
                        SELECT COUNT(*)
                        FROM information_schema.COLUMNS
                        WHERE TABLE_SCHEMA = DATABASE()
                          AND TABLE_NAME = 'employees'
                          AND COLUMN_NAME = 'service_id'
                        """,
                Integer.class
        );

        if (columnCount != null && columnCount > 0) {
            try {
                jdbcTemplate.execute(
                        "ALTER TABLE employees DROP COLUMN service_id"
                );
                log.info("Dropped service_id column from employees");
            } catch (Exception e) {
                log.warn(
                        "Could not drop employees.service_id: {}",
                        e.getMessage()
                );
            }
        }
    }

    private void ensureEmployeeStatusColumn() {
        if (!tableExists("employees")) {
            return;
        }

        Integer columnCount = jdbcTemplate.queryForObject(
                """
                        SELECT COUNT(*)
                        FROM information_schema.COLUMNS
                        WHERE TABLE_SCHEMA = DATABASE()
                          AND TABLE_NAME = 'employees'
                          AND COLUMN_NAME = 'status'
                        """,
                Integer.class
        );

        if (columnCount != null && columnCount == 0) {
            jdbcTemplate.execute("""
                    ALTER TABLE employees
                    ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
                    """);
            log.info("Added status column to employees");
        } else {
            jdbcTemplate.execute("""
                    UPDATE employees
                    SET status = 'ACTIVE'
                    WHERE status IS NULL
                    """);
        }
    }

    private void ensureDesignationOnlyUnique() {
        List<Map<String, Object>> indexes = jdbcTemplate.queryForList("""
                SELECT INDEX_NAME,
                       GROUP_CONCAT(
                           COLUMN_NAME
                           ORDER BY SEQ_IN_INDEX
                       ) AS columns
                FROM information_schema.STATISTICS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'cadre_positions'
                  AND NON_UNIQUE = 0
                  AND INDEX_NAME <> 'PRIMARY'
                GROUP BY INDEX_NAME
                """);

        boolean hasDesignationUnique = indexes.stream()
                .anyMatch(index ->
                        "designation_id".equals(index.get("columns"))
                );

        if (!hasDesignationUnique) {
            jdbcTemplate.execute("""
                    ALTER TABLE cadre_positions
                    ADD CONSTRAINT uk_cadre_designation
                    UNIQUE (designation_id)
                    """);
            log.info("Added unique constraint uk_cadre_designation");
        }
    }

    private void ensureDisplayOrderColumn() {
        Integer columnCount = jdbcTemplate.queryForObject(
                """
                        SELECT COUNT(*)
                        FROM information_schema.COLUMNS
                        WHERE TABLE_SCHEMA = DATABASE()
                          AND TABLE_NAME = 'cadre_positions'
                          AND COLUMN_NAME = 'display_order'
                        """,
                Integer.class
        );

        if (columnCount != null && columnCount == 0) {
            jdbcTemplate.execute("""
                    ALTER TABLE cadre_positions
                    ADD COLUMN display_order INT NULL
                    """);
            log.info("Added display_order column to cadre_positions");
        }
    }
}
