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
public class EmployeeDependentSchemaMigration {

    private final JdbcTemplate jdbcTemplate;

    @EventListener(ApplicationReadyEvent.class)
    public void migrateEmployeeDependentSchema() {
        try {
            if (!tableExists("employees")) {
                return;
            }

            createSpouseTableIfMissing();
            createChildrenTableIfMissing();
        } catch (Exception e) {
            log.warn(
                    "Employee dependent schema migration skipped: {}",
                    e.getMessage()
            );
        }
    }

    private void createSpouseTableIfMissing() {
        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS employee_spouses (
                    id BIGINT NOT NULL AUTO_INCREMENT,
                    employee_id BIGINT NOT NULL,
                    nic VARCHAR(20),
                    full_name VARCHAR(255) NOT NULL,
                    date_of_birth DATE NOT NULL,
                    created_at DATETIME(6),
                    updated_at DATETIME(6),
                    PRIMARY KEY (id),
                    UNIQUE KEY uk_employee_spouses_employee (employee_id),
                    CONSTRAINT fk_employee_spouses_employee
                        FOREIGN KEY (employee_id) REFERENCES employees(id)
                        ON DELETE CASCADE
                )
                """);
    }

    private void createChildrenTableIfMissing() {
        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS employee_children (
                    id BIGINT NOT NULL AUTO_INCREMENT,
                    employee_id BIGINT NOT NULL,
                    nic VARCHAR(20),
                    birth_certificate_no VARCHAR(64) NOT NULL,
                    full_name VARCHAR(255) NOT NULL,
                    date_of_birth DATE NOT NULL,
                    relationship VARCHAR(20) NOT NULL,
                    created_at DATETIME(6),
                    updated_at DATETIME(6),
                    PRIMARY KEY (id),
                    INDEX idx_employee_children_employee (employee_id),
                    CONSTRAINT fk_employee_children_employee
                        FOREIGN KEY (employee_id) REFERENCES employees(id)
                        ON DELETE CASCADE
                )
                """);
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
