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
public class EmployeeTableNormalizationMigration {

    private final JdbcTemplate jdbcTemplate;

    @EventListener(ApplicationReadyEvent.class)
    public void migrateEmployeeTableNormalization() {
        try {
            if (!tableExists("employees")) {
                return;
            }

            createContactDetailsTableIfMissing();
            createPrivateVehicleTableIfMissing();
            createBenefitsTableIfMissing();
            createTrainingProfileTableIfMissing();

            backfillContactDetails();
            backfillPrivateVehicles();
            backfillBenefits();
            backfillTrainingProfiles();

            dropLegacyEmployeeColumnsIfReady();
        } catch (Exception e) {
            log.warn(
                    "Employee table normalization migration skipped: {}",
                    e.getMessage()
            );
        }
    }

    private void createContactDetailsTableIfMissing() {
        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS employee_contact_details (
                    id BIGINT NOT NULL AUTO_INCREMENT,
                    employee_id BIGINT NOT NULL,
                    permanent_address VARCHAR(255),
                    resident_district VARCHAR(255),
                    contact_no VARCHAR(255),
                    email_address VARCHAR(255),
                    marital_status VARCHAR(20),
                    created_at DATETIME(6),
                    updated_at DATETIME(6),
                    PRIMARY KEY (id),
                    UNIQUE KEY uk_employee_contact_details_employee (employee_id),
                    CONSTRAINT fk_employee_contact_details_employee
                        FOREIGN KEY (employee_id) REFERENCES employees(id)
                        ON DELETE CASCADE
                )
                """);
    }

    private void createPrivateVehicleTableIfMissing() {
        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS employee_private_vehicles (
                    id BIGINT NOT NULL AUTO_INCREMENT,
                    employee_id BIGINT NOT NULL,
                    used_for_gov_work BIT(1),
                    description VARCHAR(512),
                    permission_date DATE,
                    expire_date DATE,
                    insurance_number VARCHAR(255),
                    license_plate_number VARCHAR(255),
                    rented BIT(1),
                    rented_from VARCHAR(255),
                    permit_collected_date DATE,
                    created_at DATETIME(6),
                    updated_at DATETIME(6),
                    PRIMARY KEY (id),
                    UNIQUE KEY uk_employee_private_vehicles_employee (employee_id),
                    CONSTRAINT fk_employee_private_vehicles_employee
                        FOREIGN KEY (employee_id) REFERENCES employees(id)
                        ON DELETE CASCADE
                )
                """);
    }

    private void createBenefitsTableIfMissing() {
        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS employee_benefits (
                    id BIGINT NOT NULL AUTO_INCREMENT,
                    employee_id BIGINT NOT NULL,
                    incremant_date VARCHAR(255),
                    widows_orphans_pension_no VARCHAR(255),
                    salary_increment_last_due_year INT,
                    salary_increment_prior_due_year INT,
                    salary_increment_done_date DATE,
                    created_at DATETIME(6),
                    updated_at DATETIME(6),
                    PRIMARY KEY (id),
                    UNIQUE KEY uk_employee_benefits_employee (employee_id),
                    CONSTRAINT fk_employee_benefits_employee
                        FOREIGN KEY (employee_id) REFERENCES employees(id)
                        ON DELETE CASCADE
                )
                """);
    }

    private void createTrainingProfileTableIfMissing() {
        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS employee_training_profiles (
                    id BIGINT NOT NULL AUTO_INCREMENT,
                    employee_id BIGINT NOT NULL,
                    training_period_years INT,
                    training_origin BIT(1) NOT NULL DEFAULT 0,
                    training_revert_snapshot TEXT,
                    created_at DATETIME(6),
                    updated_at DATETIME(6),
                    PRIMARY KEY (id),
                    UNIQUE KEY uk_employee_training_profiles_employee (employee_id),
                    CONSTRAINT fk_employee_training_profiles_employee
                        FOREIGN KEY (employee_id) REFERENCES employees(id)
                        ON DELETE CASCADE
                )
                """);
    }

    private void backfillContactDetails() {
        if (!columnExists("employees", "permanent_address")) {
            return;
        }

        jdbcTemplate.update("""
                INSERT INTO employee_contact_details (
                    employee_id,
                    permanent_address,
                    resident_district,
                    contact_no,
                    email_address,
                    marital_status,
                    created_at,
                    updated_at
                )
                SELECT
                    e.id,
                    e.permanent_address,
                    e.resident_district,
                    e.contact_no,
                    e.email_address,
                    e.marital_status,
                    NOW(6),
                    NOW(6)
                FROM employees e
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM employee_contact_details cd
                    WHERE cd.employee_id = e.id
                )
                """);
    }

    private void backfillPrivateVehicles() {
        if (!columnExists("employees", "private_vehicle_used_for_gov_work")) {
            return;
        }

        jdbcTemplate.update("""
                INSERT INTO employee_private_vehicles (
                    employee_id,
                    used_for_gov_work,
                    description,
                    permission_date,
                    expire_date,
                    insurance_number,
                    license_plate_number,
                    rented,
                    rented_from,
                    permit_collected_date,
                    created_at,
                    updated_at
                )
                SELECT
                    e.id,
                    e.private_vehicle_used_for_gov_work,
                    e.private_vehicle_description,
                    e.private_vehicle_permission_date,
                    e.private_vehicle_expire_date,
                    e.private_vehicle_insurance_number,
                    e.private_vehicle_license_plate_number,
                    e.private_vehicle_rented,
                    e.private_vehicle_rented_from,
                    e.vehicle_permit_collected_date,
                    NOW(6),
                    NOW(6)
                FROM employees e
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM employee_private_vehicles pv
                    WHERE pv.employee_id = e.id
                )
                """);
    }

    private void backfillBenefits() {
        if (!columnExists("employees", "incremant_date")) {
            return;
        }

        jdbcTemplate.update("""
                INSERT INTO employee_benefits (
                    employee_id,
                    incremant_date,
                    widows_orphans_pension_no,
                    salary_increment_last_due_year,
                    salary_increment_prior_due_year,
                    salary_increment_done_date,
                    created_at,
                    updated_at
                )
                SELECT
                    e.id,
                    e.incremant_date,
                    e.widows_orphans_pension_no,
                    e.salary_increment_last_due_year,
                    e.salary_increment_prior_due_year,
                    e.salary_increment_done_date,
                    NOW(6),
                    NOW(6)
                FROM employees e
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM employee_benefits b
                    WHERE b.employee_id = e.id
                )
                """);
    }

    private void backfillTrainingProfiles() {
        if (!columnExists("employees", "training_origin")) {
            return;
        }

        jdbcTemplate.update("""
                INSERT INTO employee_training_profiles (
                    employee_id,
                    training_period_years,
                    training_origin,
                    training_revert_snapshot,
                    created_at,
                    updated_at
                )
                SELECT
                    e.id,
                    e.training_period_years,
                    COALESCE(e.training_origin, 0),
                    e.training_revert_snapshot,
                    NOW(6),
                    NOW(6)
                FROM employees e
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM employee_training_profiles tp
                    WHERE tp.employee_id = e.id
                )
                """);
    }

    private void dropLegacyEmployeeColumnsIfReady() {
        if (!columnExists("employees", "permanent_address")) {
            return;
        }

        long employeeCount = countRows("employees");
        if (employeeCount != countRows("employee_contact_details")
                || employeeCount != countRows("employee_private_vehicles")
                || employeeCount != countRows("employee_benefits")
                || employeeCount != countRows("employee_training_profiles")) {
            log.warn(
                    "Employee table normalization: row counts do not match; "
                            + "skipping legacy column drop"
            );
            return;
        }

        List<String> legacyColumns = List.of(
                "permanent_address",
                "resident_district",
                "contact_no",
                "email_address",
                "marital_status",
                "private_vehicle_used_for_gov_work",
                "private_vehicle_description",
                "private_vehicle_permission_date",
                "private_vehicle_expire_date",
                "private_vehicle_insurance_number",
                "private_vehicle_license_plate_number",
                "private_vehicle_rented",
                "private_vehicle_rented_from",
                "vehicle_permit_collected_date",
                "incremant_date",
                "widows_orphans_pension_no",
                "salary_increment_last_due_year",
                "salary_increment_prior_due_year",
                "salary_increment_done_date",
                "training_period_years",
                "training_origin",
                "training_revert_snapshot"
        );

        for (String column : legacyColumns) {
            dropColumnIfExists("employees", column);
        }

        log.info("Employee table normalization: dropped legacy columns from employees");
    }

    private long countRows(String tableName) {
        if (!tableExists(tableName)) {
            return 0;
        }

        Long count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM " + tableName,
                Long.class
        );
        return count != null ? count : 0;
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

    private void dropColumnIfExists(String tableName, String columnName) {
        if (!columnExists(tableName, columnName)) {
            return;
        }

        jdbcTemplate.execute(
                "ALTER TABLE " + tableName + " DROP COLUMN " + columnName
        );
        log.info("Dropped legacy column {}.{}", tableName, columnName);
    }
}
