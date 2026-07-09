package com.nwpengdep.hrms.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
@RequiredArgsConstructor
public class UserRoleSchemaMigration implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(ApplicationArguments args) {
        migrateUserRoleColumn();
    }

    private void migrateUserRoleColumn() {
        try {
            if (!tableExists("users")) {
                return;
            }

            String columnType = jdbcTemplate.queryForObject(
                    """
                            SELECT COLUMN_TYPE
                            FROM INFORMATION_SCHEMA.COLUMNS
                            WHERE TABLE_SCHEMA = DATABASE()
                              AND TABLE_NAME = 'users'
                              AND COLUMN_NAME = 'role'
                            """,
                    String.class
            );

            if (columnType != null && columnType.toLowerCase().startsWith("enum")) {
                jdbcTemplate.execute(
                        "ALTER TABLE users MODIFY COLUMN role VARCHAR(32) NOT NULL"
                );
                log.info("Converted users.role from ENUM to VARCHAR(32)");
            }
        } catch (Exception e) {
            log.error("User role schema migration failed", e);
            throw new IllegalStateException("Failed to migrate users.role column", e);
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
