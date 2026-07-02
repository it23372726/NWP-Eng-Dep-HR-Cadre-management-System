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
public class ContractEmployeeSchemaMigration {

    private final JdbcTemplate jdbcTemplate;

    @EventListener(ApplicationReadyEvent.class)
    public void migrateContractEmployeeSchema() {
        try {
            ensureContractDateColumns();
            ensureNullableServiceLevel();
        } catch (Exception e) {
            log.warn(
                    "Contract employee schema migration skipped: {}",
                    e.getMessage()
            );
        }
    }

    private void ensureContractDateColumns() {
        addColumnIfMissing("employees", "contract_start_date", "DATE");
        addColumnIfMissing("employees", "contract_end_date", "DATE");
    }

    private void ensureNullableServiceLevel() {
        if (!tableExists("employees") || !columnExists("employees", "service_level_id")) {
            return;
        }

        String isNullable = jdbcTemplate.queryForObject(
                """
                        SELECT IS_NULLABLE
                        FROM information_schema.COLUMNS
                        WHERE TABLE_SCHEMA = DATABASE()
                          AND TABLE_NAME = 'employees'
                          AND COLUMN_NAME = 'service_level_id'
                        """,
                String.class
        );

        if ("YES".equalsIgnoreCase(isNullable)) {
            return;
        }

        jdbcTemplate.execute(
                """
                        ALTER TABLE employees
                        MODIFY COLUMN service_level_id BIGINT NULL
                        """
        );
        log.info("Made employees.service_level_id nullable for contract employees");
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
