package com.nwpengdep.hrms.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class ServiceQualificationSchemaMigration {

    private final JdbcTemplate jdbcTemplate;

    @EventListener(ApplicationReadyEvent.class)
    public void migrateServiceQualificationSchema() {
        try {
            if (!tableExists("services")) {
                return;
            }

            addColumnIfMissing("services", "grade2_required_years", "INT");
            addColumnIfMissing("services", "grade1_required_years", "INT");
            addColumnIfMissing("services", "supra_required_years", "INT");
            addColumnIfMissing("services", "special_required_years", "INT");
            createServiceAllowedGradesTableIfMissing();
            createServiceRequirementTablesIfMissing();
            reconcileDualTerminalGrades();
            dropDesignationRuleArtifacts();
        } catch (Exception e) {
            log.warn(
                    "Service qualification schema migration skipped: {}",
                    e.getMessage()
            );
        }
    }

    private void createServiceAllowedGradesTableIfMissing() {
        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS service_allowed_grades (
                    service_id BIGINT NOT NULL,
                    grade VARCHAR(20) NOT NULL,
                    PRIMARY KEY (service_id, grade),
                    CONSTRAINT fk_service_allowed_grades_service
                        FOREIGN KEY (service_id) REFERENCES services(id)
                        ON DELETE CASCADE
                )
                """);
    }

    private void createServiceRequirementTablesIfMissing() {
        createServiceRequirementTable(
                "service_permanent_requirements",
                "fk_service_permanent_requirements_service"
        );
        createServiceRequirementTable(
                "service_grade2_requirements",
                "fk_service_grade2_requirements_service"
        );
        createServiceRequirementTable(
                "service_grade1_requirements",
                "fk_service_grade1_requirements_service"
        );
        createServiceRequirementTable(
                "service_supra_requirements",
                "fk_service_supra_requirements_service"
        );
        createServiceRequirementTable(
                "service_special_requirements",
                "fk_service_special_requirements_service"
        );
    }

    private void reconcileDualTerminalGrades() {
        if (!tableExists("service_allowed_grades")) {
            return;
        }

        List<Long> serviceIds = jdbcTemplate.queryForList(
                """
                        SELECT DISTINCT sag1.service_id
                        FROM service_allowed_grades sag1
                        INNER JOIN service_allowed_grades sag2
                            ON sag1.service_id = sag2.service_id
                        WHERE sag1.grade = 'SUPRA'
                          AND sag2.grade = 'SPECIAL'
                        """,
                Long.class
        );

        for (Long serviceId : serviceIds) {
            jdbcTemplate.update(
                    """
                            DELETE FROM service_allowed_grades
                            WHERE service_id = ? AND grade = 'SPECIAL'
                            """,
                    serviceId
            );
            String serviceCode = jdbcTemplate.queryForObject(
                    "SELECT service_code FROM services WHERE id = ?",
                    String.class,
                    serviceId
            );
            log.warn(
                    "Service '{}' had both Supra and Special configured; "
                            + "removed Special. Review and reconfigure if needed.",
                    serviceCode
            );
        }
    }

    private void createServiceRequirementTable(
            String tableName,
            String constraintName
    ) {
        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS %s (
                    id BIGINT NOT NULL AUTO_INCREMENT,
                    service_id BIGINT NOT NULL,
                    requirement_name VARCHAR(255) NOT NULL,
                    PRIMARY KEY (id),
                    INDEX idx_%s_service (service_id),
                    CONSTRAINT %s
                        FOREIGN KEY (service_id) REFERENCES services(id)
                        ON DELETE CASCADE
                )
                """.formatted(tableName, tableName, constraintName));
    }

    private void dropDesignationRuleArtifacts() {
        dropTableIfExists("designation_permanent_requirements");
        dropTableIfExists("designation_grade2_requirements");
        dropTableIfExists("designation_grade1_requirements");
        dropColumnIfExists("designations", "grade2_required_years");
        dropColumnIfExists("designations", "grade1_required_years");
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

    private void dropColumnIfExists(String tableName, String columnName) {
        if (!tableExists(tableName) || !columnExists(tableName, columnName)) {
            return;
        }
        jdbcTemplate.execute(
                "ALTER TABLE " + tableName + " DROP COLUMN " + columnName
        );
        log.info("Dropped {}.{}", tableName, columnName);
    }

    private void dropTableIfExists(String tableName) {
        if (!tableExists(tableName)) {
            return;
        }
        jdbcTemplate.execute("DROP TABLE " + tableName);
        log.info("Dropped table {}", tableName);
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
