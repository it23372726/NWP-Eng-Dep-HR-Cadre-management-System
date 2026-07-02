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
public class EmployeeDetailsSchemaMigration {

    private final JdbcTemplate jdbcTemplate;

    @EventListener(ApplicationReadyEvent.class)
    public void migrateEmployeeDetailsSchema() {
        try {
            addColumnIfMissing(
                    "employees",
                    "widows_orphans_pension_no",
                    "VARCHAR(64)"
            );
            addColumnIfMissing(
                    "employees",
                    "email_address",
                    "VARCHAR(255)"
            );
            addColumnIfMissing(
                    "employees",
                    "tin",
                    "VARCHAR(32)"
            );
            addColumnIfMissing(
                    "employees",
                    "private_vehicle_expire_date",
                    "DATE"
            );
            addColumnIfMissing(
                    "employees",
                    "private_vehicle_insurance_number",
                    "VARCHAR(64)"
            );
            addColumnIfMissing(
                    "employees",
                    "private_vehicle_license_plate_number",
                    "VARCHAR(32)"
            );
            addColumnIfMissing(
                    "employees",
                    "private_vehicle_rented",
                    "TINYINT(1)"
            );
            addColumnIfMissing(
                    "employees",
                    "private_vehicle_rented_from",
                    "VARCHAR(255)"
            );
        } catch (Exception e) {
            log.warn(
                    "Employee details schema migration skipped: {}",
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
