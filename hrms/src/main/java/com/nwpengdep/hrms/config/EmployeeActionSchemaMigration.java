package com.nwpengdep.hrms.config;

import com.nwpengdep.hrms.constants.DepartmentConstants;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class EmployeeActionSchemaMigration {

    private static final String OFFICE_CHANGE = "OFFICE_CHANGE";

    private final JdbcTemplate jdbcTemplate;

    @EventListener(ApplicationReadyEvent.class)
    public void migrateEmployeeActionSchema() {
        try {
            ensureActionTypeEnum();
            ensureDepartmentOfficeColumns();
            ensureOfficesTable();
            ensureActionDistrictColumn();
            ensureProfilePhotoColumn();
            ensureMaritalStatusColumn();
            ensurePrivateVehicleColumns();
            ensureVehiclePermitCollectedDateColumn();
            backfillDepartmentOfficeData();
        } catch (Exception e) {
            log.warn(
                    "Employee action schema migration skipped: {}",
                    e.getMessage()
            );
        }
    }

    private void ensureActionTypeEnum() {
        if (!tableExists("employee_actions")
                || !columnExists("employee_actions", "action_type")) {
            return;
        }

        String columnType = jdbcTemplate.queryForObject(
                """
                        SELECT COLUMN_TYPE
                        FROM information_schema.COLUMNS
                        WHERE TABLE_SCHEMA = DATABASE()
                          AND TABLE_NAME = 'employee_actions'
                          AND COLUMN_NAME = 'action_type'
                        """,
                String.class
        );

        if (columnType == null || !columnType.toLowerCase().startsWith("enum(")) {
            return;
        }

        if (columnType.contains("'" + OFFICE_CHANGE + "'")) {
            return;
        }

        jdbcTemplate.execute("""
                ALTER TABLE employee_actions
                MODIFY COLUMN action_type ENUM(
                    'NEW_APPOINTMENT',
                    'TRANSFER_IN',
                    'TRANSFER_OUT',
                    'PROMOTION',
                    'ASSIGNMENT_GRADE_UPDATE',
                    'PERMANENT_CONFIRMATION',
                    'RETIREMENT_OR_RESIGNATION',
                    'DEATH',
                    'DISMISSAL',
                    'OFFICE_CHANGE'
                ) NOT NULL
                """);
        log.info("Ensured OFFICE_CHANGE exists in employee_actions.action_type enum");
    }

    private void ensureDepartmentOfficeColumns() {
        addColumnIfMissing("employees", "current_department", "VARCHAR(255)");
        addColumnIfMissing("employees", "current_office", "VARCHAR(255)");
        addColumnIfMissing("employee_actions", "department", "VARCHAR(255)");
        addColumnIfMissing("employee_actions", "office", "VARCHAR(255)");
        addColumnIfMissing("employee_actions", "from_department", "VARCHAR(255)");
        addColumnIfMissing("employee_actions", "from_office", "VARCHAR(255)");
        addColumnIfMissing("employee_actions", "to_department", "VARCHAR(255)");
        addColumnIfMissing("employee_actions", "to_office", "VARCHAR(255)");
        addColumnIfMissing("employee_actions", "linked_action_id", "BIGINT");
    }

    private void ensureOfficesTable() {
        if (tableExists("offices")) {
            return;
        }
        jdbcTemplate.execute("""
                CREATE TABLE offices (
                    id BIGINT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    district VARCHAR(50) NOT NULL,
                    UNIQUE KEY uk_office_name_district (name, district)
                )
                """);
        log.info("Created offices table");
    }

    private void ensureActionDistrictColumn() {
        addColumnIfMissing("employee_actions", "district", "VARCHAR(50)");
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

    private void ensureProfilePhotoColumn() {
        addColumnIfMissing("employees", "profile_photo_path", "VARCHAR(512)");
    }

    private void ensureMaritalStatusColumn() {
        addColumnIfMissing("employees", "marital_status", "VARCHAR(20)");
    }

    private void ensurePrivateVehicleColumns() {
        addColumnIfMissing(
                "employees",
                "private_vehicle_used_for_gov_work",
                "TINYINT(1)"
        );
        addColumnIfMissing(
                "employees",
                "private_vehicle_description",
                "VARCHAR(512)"
        );
        addColumnIfMissing(
                "employees",
                "private_vehicle_permission_date",
                "DATE"
        );
    }

    private void ensureVehiclePermitCollectedDateColumn() {
        addColumnIfMissing(
                "employees",
                "vehicle_permit_collected_date",
                "DATE"
        );
    }

    private void backfillDepartmentOfficeData() {
        if (!tableExists("employees")) {
            return;
        }

        jdbcTemplate.update(
                """
                        UPDATE employees
                        SET current_department = ?,
                            current_office = COALESCE(
                                NULLIF(TRIM(current_office), ''),
                                NULLIF(TRIM(current_working_place), ''),
                                'Unknown'
                            )
                        WHERE current_department IS NULL
                           OR TRIM(current_department) = ''
                        """,
                DepartmentConstants.NWP_ENGINEERING
        );

        if (!tableExists("employee_actions")) {
            return;
        }

        jdbcTemplate.update(
                """
                        UPDATE employee_actions
                        SET department = ?,
                            office = COALESCE(
                                NULLIF(TRIM(office), ''),
                                NULLIF(TRIM(transferred_from), ''),
                                NULLIF(TRIM(transferred_to), ''),
                                'Unknown'
                            )
                        WHERE department IS NULL
                           OR TRIM(department) = ''
                        """,
                DepartmentConstants.NWP_ENGINEERING
        );

        jdbcTemplate.update("""
                UPDATE employee_actions
                SET from_department = transferred_from,
                    to_department = transferred_to
                WHERE action_type = 'TRANSFER_OUT'
                  AND transferred_to IS NOT NULL
                  AND (to_department IS NULL OR TRIM(to_department) = '')
                """);

        jdbcTemplate.update("""
                UPDATE employee_actions
                SET from_department = transferred_from
                WHERE action_type = 'TRANSFER_IN'
                  AND transferred_from IS NOT NULL
                  AND (from_department IS NULL OR TRIM(from_department) = '')
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
