package com.nwpengdep.hrms.config;

import com.nwpengdep.hrms.service.OrganizationSettingsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Component
@RequiredArgsConstructor
public class OrganizationSettingsBootstrapInitializer {

    private final JdbcTemplate jdbcTemplate;
    private final OrganizationSettingsService organizationSettingsService;

    @Order(5)
    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void bootstrapOrganizationSettings() {
        try {
            createSettingsTableIfMissing();
            migrateDistrictColumnsToLabels();
            organizationSettingsService.ensureSettings();
            organizationSettingsService.refreshRuntimeCache();
            normalizeStoredDistrictLabels();
        } catch (Exception exception) {
            log.warn(
                    "Organization settings bootstrap skipped: {}",
                    exception.getMessage()
            );
        }
    }

    private void createSettingsTableIfMissing() {
        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS organization_settings (
                    id BIGINT NOT NULL,
                    primary_department_name VARCHAR(255) NOT NULL,
                    provincial_council_name VARCHAR(255) NOT NULL,
                    department_short_name VARCHAR(120) NOT NULL,
                    application_name VARCHAR(120) NOT NULL,
                    council_label VARCHAR(120) NOT NULL,
                    districts_json TEXT NOT NULL,
                    updated_at TIMESTAMP NOT NULL,
                    PRIMARY KEY (id)
                )
                """);
    }

    private void migrateDistrictColumnsToLabels() {
        convertEnumCodesToLabels("offices", "district");
        convertEnumCodesToLabels("employees", "current_district_of_working");
        if (columnExists("employee_actions", "district")) {
            convertEnumCodesToLabels("employee_actions", "district");
        }
    }

    private void convertEnumCodesToLabels(String table, String column) {
        if (!columnExists(table, column)) {
            return;
        }
        jdbcTemplate.update(
                "UPDATE " + table + " SET " + column + " = 'Kurunegala' WHERE "
                        + column + " IN ('KURUNEGALA', 'Kurunegala')"
        );
        jdbcTemplate.update(
                "UPDATE " + table + " SET " + column + " = 'Puttalam' WHERE "
                        + column + " IN ('PUTTALAM', 'Puttalam')"
        );
    }

    private void normalizeStoredDistrictLabels() {
        for (String district : organizationSettingsService.getDistricts()) {
            String code = district.toUpperCase().replace(' ', '_');
            jdbcTemplate.update(
                    "UPDATE offices SET district = ? WHERE district = ?",
                    district,
                    code
            );
            jdbcTemplate.update(
                    """
                            UPDATE employees
                            SET current_district_of_working = ?
                            WHERE current_district_of_working = ?
                            """,
                    district,
                    code
            );
            if (columnExists("employee_actions", "district")) {
                jdbcTemplate.update(
                        "UPDATE employee_actions SET district = ? WHERE district = ?",
                        district,
                        code
                );
            }
        }
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
