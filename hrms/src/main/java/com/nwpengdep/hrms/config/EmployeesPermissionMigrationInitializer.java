package com.nwpengdep.hrms.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * Migrates legacy EMPLOYEES permission rows to EMPLOYEE_VIEW / EMPLOYEE_EDIT.
 * VIEW_ONLY roles get VIEW; all other roles get EDIT. Idempotent.
 * Also widens role_permissions.permission from MySQL ENUM to VARCHAR when needed.
 */
@Slf4j
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 2)
@RequiredArgsConstructor
public class EmployeesPermissionMigrationInitializer implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(ApplicationArguments args) {
        migrateEmployeesPermission();
    }

    private void migrateEmployeesPermission() {
        try {
            if (!tableExists("role_permissions")) {
                return;
            }

            ensurePermissionColumnIsVarchar();

            Integer legacyCount = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM role_permissions WHERE permission = 'EMPLOYEES'",
                    Integer.class
            );
            if (legacyCount == null || legacyCount == 0) {
                return;
            }

            List<Map<String, Object>> legacyRows = jdbcTemplate.queryForList(
                    "SELECT id, role FROM role_permissions WHERE permission = 'EMPLOYEES'"
            );

            int viewInserted = 0;
            int editInserted = 0;

            for (Map<String, Object> row : legacyRows) {
                String role = String.valueOf(row.get("role"));
                String replacement = "VIEW_ONLY".equals(role) ? "EMPLOYEE_VIEW" : "EMPLOYEE_EDIT";

                Integer existing = jdbcTemplate.queryForObject(
                        "SELECT COUNT(*) FROM role_permissions WHERE role = ? AND permission = ?",
                        Integer.class,
                        role,
                        replacement
                );
                if (existing == null || existing == 0) {
                    jdbcTemplate.update(
                            "INSERT INTO role_permissions (role, permission) VALUES (?, ?)",
                            role,
                            replacement
                    );
                    if ("EMPLOYEE_VIEW".equals(replacement)) {
                        viewInserted++;
                    } else {
                        editInserted++;
                    }
                }
            }

            int deleted = jdbcTemplate.update(
                    "DELETE FROM role_permissions WHERE permission = 'EMPLOYEES'"
            );

            log.info(
                    "Migrated EMPLOYEES permission: {} legacy rows removed, EMPLOYEE_VIEW inserted ({}), EMPLOYEE_EDIT inserted ({})",
                    deleted,
                    viewInserted,
                    editInserted
            );
        } catch (Exception e) {
            log.error("EMPLOYEES permission migration failed", e);
            throw new IllegalStateException("Failed to migrate EMPLOYEES permission", e);
        }
    }

    private void ensurePermissionColumnIsVarchar() {
        String columnType = jdbcTemplate.queryForObject(
                """
                        SELECT COLUMN_TYPE
                        FROM INFORMATION_SCHEMA.COLUMNS
                        WHERE TABLE_SCHEMA = DATABASE()
                          AND TABLE_NAME = 'role_permissions'
                          AND COLUMN_NAME = 'permission'
                        """,
                String.class
        );

        if (columnType != null && columnType.toLowerCase().startsWith("enum")) {
            jdbcTemplate.execute(
                    "ALTER TABLE role_permissions MODIFY COLUMN permission VARCHAR(32) NOT NULL"
            );
            log.info("Converted role_permissions.permission from ENUM to VARCHAR(32)");
        }
    }

    private boolean tableExists(String tableName) {
        Integer count = jdbcTemplate.queryForObject(
                """
                        SELECT COUNT(*)
                        FROM INFORMATION_SCHEMA.TABLES
                        WHERE TABLE_SCHEMA = DATABASE()
                          AND TABLE_NAME = ?
                        """,
                Integer.class,
                tableName
        );
        return count != null && count > 0;
    }
}
