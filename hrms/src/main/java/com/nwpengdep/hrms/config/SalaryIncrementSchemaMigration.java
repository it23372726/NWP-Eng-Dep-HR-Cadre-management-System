package com.nwpengdep.hrms.config;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import com.nwpengdep.hrms.service.SalaryIncrementLegacyImportService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
@Order(300)
public class SalaryIncrementSchemaMigration {

    private final JdbcTemplate jdbcTemplate;
    private final SalaryIncrementLegacyImportService legacyImportService;

    @Order(300)
    @EventListener(ApplicationReadyEvent.class)
    public void migrateSalaryIncrementSchema() {
        try {
            if (!tableExists("employees")) {
                return;
            }

            createLedgerTableIfMissing();
            addActiveYearUniqueIfSupported();
            legacyImportService.importLegacySnapshots();
        } catch (Exception e) {
            log.warn("Salary increment ledger migration skipped: {}", e.getMessage());
        }
    }

    private void createLedgerTableIfMissing() {
        if (tableExists("salary_increment_records")) {
            return;
        }

        jdbcTemplate.execute("""
                CREATE TABLE salary_increment_records (
                    id BIGINT NOT NULL AUTO_INCREMENT,
                    employee_id BIGINT NOT NULL,
                    due_year INT NOT NULL,
                    due_date DATE,
                    done_date DATE,
                    operation_id CHAR(36) NOT NULL,
                    operation_type VARCHAR(32) NOT NULL,
                    record_status VARCHAR(16) NOT NULL,
                    recorded_at DATETIME(6) NOT NULL,
                    recorded_by VARCHAR(100),
                    updated_at DATETIME(6),
                    updated_by VARCHAR(100),
                    reversed_at DATETIME(6),
                    reversed_by VARCHAR(100),
                    version BIGINT NOT NULL DEFAULT 0,
                    legacy_imported TINYINT(1) NOT NULL DEFAULT 0,
                    legacy_import_key VARCHAR(80),
                    PRIMARY KEY (id),
                    UNIQUE KEY uk_salary_increment_legacy_key (legacy_import_key),
                    KEY idx_sir_employee (employee_id),
                    KEY idx_sir_employee_due_year (employee_id, due_year),
                    KEY idx_sir_operation_id (operation_id),
                    KEY idx_sir_employee_status (employee_id, record_status),
                    KEY idx_sir_employee_recorded_at (employee_id, recorded_at),
                    CONSTRAINT fk_salary_increment_employee
                        FOREIGN KEY (employee_id) REFERENCES employees (id)
                        ON DELETE CASCADE
                )
                """);
        log.info("Created salary_increment_records table");
    }

    private void addActiveYearUniqueIfSupported() {
        if (!tableExists("salary_increment_records")) return;
        if (!columnExists("salary_increment_records", "service_appointment_key"))
            jdbcTemplate.execute("ALTER TABLE salary_increment_records ADD COLUMN service_appointment_key VARCHAR(36)");
        String product = jdbcTemplate.execute((org.springframework.jdbc.core.ConnectionCallback<String>) c -> c.getMetaData().getDatabaseProductName());
        if (!"MySQL".equalsIgnoreCase(product) && !"MariaDB".equalsIgnoreCase(product)) return;
        if (!columnExists("salary_increment_records", "active_scope_year")) {
            jdbcTemplate.execute("""
                    ALTER TABLE salary_increment_records ADD COLUMN active_scope_year VARCHAR(64)
                    GENERATED ALWAYS AS (CASE WHEN record_status = 'RECORDED'
                      THEN CONCAT(COALESCE(service_appointment_key, 'INITIAL'), ':', due_year) ELSE NULL END) STORED
                    """);
        }
        Integer hasNew = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'salary_increment_records' AND INDEX_NAME = 'uk_sir_active_scope_year'", Integer.class);
        if (hasNew == null || hasNew == 0)
            jdbcTemplate.execute("ALTER TABLE salary_increment_records ADD UNIQUE KEY uk_sir_active_scope_year (employee_id, active_scope_year)");
        Integer hasOld = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'salary_increment_records' AND INDEX_NAME = 'uk_sir_active_year'", Integer.class);
        if (hasOld != null && hasOld > 0) jdbcTemplate.execute("ALTER TABLE salary_increment_records DROP INDEX uk_sir_active_year");
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
