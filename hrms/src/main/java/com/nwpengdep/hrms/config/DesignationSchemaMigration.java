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
public class DesignationSchemaMigration {

    private final JdbcTemplate jdbcTemplate;

    @EventListener(ApplicationReadyEvent.class)
    @Order(9)
    public void migrateDesignationConstraints() {
        try {
            if (!tableExists("designations")) {
                return;
            }

            dropObsoleteDesignationNameUnique();
            ensureCompositeDesignationUnique();
        } catch (Exception e) {
            log.warn(
                    "Designation schema migration skipped: {}",
                    e.getMessage()
            );
        }
    }

    private void dropObsoleteDesignationNameUnique() {
        List<Map<String, Object>> indexes = jdbcTemplate.queryForList("""
                SELECT INDEX_NAME,
                       GROUP_CONCAT(
                           COLUMN_NAME
                           ORDER BY SEQ_IN_INDEX
                       ) AS columns
                FROM information_schema.STATISTICS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'designations'
                  AND NON_UNIQUE = 0
                  AND INDEX_NAME <> 'PRIMARY'
                GROUP BY INDEX_NAME
                """);

        for (Map<String, Object> index : indexes) {
            String columns = (String) index.get("columns");
            String indexName = (String) index.get("INDEX_NAME");

            if ("designation_name".equals(columns)) {
                jdbcTemplate.execute(
                        "ALTER TABLE designations DROP INDEX `"
                                + indexName + "`"
                );
                log.info(
                        "Dropped obsolete unique index '{}' on designations.designation_name",
                        indexName
                );
            }
        }
    }

    private void ensureCompositeDesignationUnique() {
        List<Map<String, Object>> indexes = jdbcTemplate.queryForList("""
                SELECT INDEX_NAME,
                       GROUP_CONCAT(
                           COLUMN_NAME
                           ORDER BY SEQ_IN_INDEX
                       ) AS columns
                FROM information_schema.STATISTICS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'designations'
                  AND NON_UNIQUE = 0
                  AND INDEX_NAME <> 'PRIMARY'
                GROUP BY INDEX_NAME
                """);

        boolean hasCompositeUnique = indexes.stream()
                .anyMatch(index ->
                        "designation_name,service_id,service_level_id".equals(
                                index.get("columns")
                        )
                );

        if (!hasCompositeUnique) {
            jdbcTemplate.execute("""
                    ALTER TABLE designations
                    ADD CONSTRAINT uk_designation_name_service_level
                    UNIQUE (designation_name, service_id, service_level_id)
                    """);
            log.info(
                    "Added composite unique constraint uk_designation_name_service_level"
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
}
