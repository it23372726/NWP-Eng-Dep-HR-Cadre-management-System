package com.nwpengdep.hrms.config;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class EmployeeQualificationSchemaMigration {

    private final JdbcTemplate jdbcTemplate;

    @EventListener(ApplicationReadyEvent.class)
    public void migrateEmployeeQualificationData() {
        try {
            if (!tableExists("employees")) {
                return;
            }

            createRequirementsTableIfMissing();
            upgradeEmployeeRequirementTypeColumn();
            createCareerProgressionTableIfMissing();
            createDesignationRequirementTablesIfMissing();
            addDesignationProgressionColumns();
            migrateCareerProgressionFromEmployeeColumns();
            migrateCareerProgressionFromProgressionTables();
            migrateRequirementsFromEmployeeColumns();
            migrateRequirementsFromConfirmationTable();
            migrateRequirementsFromGradeProgressTable();
            dropOldConfirmationRequirementColumns();
            dropOldGradeProgressRequirementColumns();
            dropOldEmployeeQualificationColumns();
            dropOldProgressionTables();
            backfillDesignationRequirementCompletions();
            addGradeAchievedDateColumns();
            removeLegacyRequirementRecords();
            ensureDesignationCreatedAtColumn();
        } catch (Exception e) {
            log.warn(
                    "Employee qualification schema migration skipped: {}",
                    e.getMessage()
            );
        }
    }

    private void createRequirementsTableIfMissing() {
        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS employee_requirements (
                    id BIGINT NOT NULL AUTO_INCREMENT,
                    employee_id BIGINT NOT NULL,
                    requirement_type VARCHAR(80) NOT NULL,
                    requirement_name VARCHAR(255),
                    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
                    completed_date DATE,
                    remarks VARCHAR(255),
                    created_at DATETIME(6),
                    updated_at DATETIME(6),
                    PRIMARY KEY (id),
                    INDEX idx_employee_requirements_employee (employee_id),
                    INDEX idx_employee_requirements_type (requirement_type),
                    CONSTRAINT fk_employee_requirements_employee
                        FOREIGN KEY (employee_id) REFERENCES employees(id)
                        ON DELETE CASCADE
                )
                """);
    }

    private void upgradeEmployeeRequirementTypeColumn() {
        if (!tableExists("employee_requirements")
                || !columnExists("employee_requirements", "requirement_type")) {
            return;
        }

        String columnType = jdbcTemplate.queryForObject(
                """
                        SELECT COLUMN_TYPE
                        FROM information_schema.COLUMNS
                        WHERE TABLE_SCHEMA = DATABASE()
                          AND TABLE_NAME = 'employee_requirements'
                          AND COLUMN_NAME = 'requirement_type'
                        """,
                String.class
        );

        if (columnType == null
                || !columnType.toLowerCase().startsWith("enum(")) {
            return;
        }

        jdbcTemplate.execute("""
                ALTER TABLE employee_requirements
                MODIFY COLUMN requirement_type VARCHAR(80) NOT NULL
                """);
        log.info(
                "Upgraded employee_requirements.requirement_type from ENUM to VARCHAR(80)"
        );
    }

    private void createCareerProgressionTableIfMissing() {
        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS employee_career_progression (
                    id BIGINT NOT NULL AUTO_INCREMENT,
                    employee_id BIGINT NOT NULL,
                    qualified_for_permanent BIT NOT NULL DEFAULT 0,
                    permanent_qualification_date DATE,
                    permanent_confirmation_date DATE,
                    grade2_required_years INT,
                    grade2_eligibility_date DATE,
                    qualified_for_grade2 BIT NOT NULL DEFAULT 0,
                    grade1_required_years INT,
                    grade1_eligibility_date DATE,
                    qualified_for_grade1 BIT NOT NULL DEFAULT 0,
                    supra_required_years INT,
                    supra_eligibility_date DATE,
                    qualified_for_supra BIT NOT NULL DEFAULT 0,
                    special_required_years INT,
                    special_eligibility_date DATE,
                    qualified_for_special BIT NOT NULL DEFAULT 0,
                    remarks VARCHAR(255),
                    created_at DATETIME(6),
                    updated_at DATETIME(6),
                    PRIMARY KEY (id),
                    UNIQUE KEY uk_employee_career_progression_employee (employee_id),
                    CONSTRAINT fk_employee_career_progression_employee
                        FOREIGN KEY (employee_id) REFERENCES employees(id)
                        ON DELETE CASCADE
                )
                """);
    }

    private void createDesignationRequirementTablesIfMissing() {
        createDesignationRequirementTable(
                "designation_permanent_requirements",
                "fk_designation_permanent_requirements_designation"
        );
        createDesignationRequirementTable(
                "designation_grade2_requirements",
                "fk_designation_grade2_requirements_designation"
        );
        createDesignationRequirementTable(
                "designation_grade1_requirements",
                "fk_designation_grade1_requirements_designation"
        );
    }

    private void createDesignationRequirementTable(
            String tableName,
            String constraintName
    ) {
        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS %s (
                    id BIGINT NOT NULL AUTO_INCREMENT,
                    designation_id BIGINT NOT NULL,
                    requirement_name VARCHAR(255) NOT NULL,
                    PRIMARY KEY (id),
                    INDEX idx_%s_designation (designation_id),
                    CONSTRAINT %s
                        FOREIGN KEY (designation_id) REFERENCES designations(id)
                        ON DELETE CASCADE
                )
                """.formatted(tableName, tableName, constraintName));
    }

    private void addDesignationProgressionColumns() {
        addColumnIfMissing(
                "designations",
                "grade2_required_years",
                "INT"
        );
        addColumnIfMissing(
                "designations",
                "grade1_required_years",
                "INT"
        );
    }

    private void migrateCareerProgressionFromEmployeeColumns() {
        if (!columnExists("employees", "qualified_for_permanent")
                || !columnExists("employees", "grade2_required_years")) {
            return;
        }

        jdbcTemplate.execute("""
                INSERT INTO employee_career_progression (
                    employee_id,
                    qualified_for_permanent,
                    permanent_qualification_date,
                    permanent_confirmation_date,
                    grade2_required_years,
                    grade2_eligibility_date,
                    qualified_for_grade2,
                    grade1_required_years,
                    grade1_eligibility_date,
                    qualified_for_grade1,
                    created_at,
                    updated_at
                )
                SELECT
                    e.id,
                    CASE WHEN %s THEN COALESCE(e.qualified_for_permanent, 0) ELSE 0 END,
                    CASE WHEN %s THEN e.permanent_qualification_date ELSE NULL END,
                    CASE WHEN %s THEN e.permanent_confirmation_date ELSE NULL END,
                    CASE WHEN %s THEN e.grade2_required_years ELSE NULL END,
                    CASE WHEN %s THEN e.grade2_eligibility_date ELSE NULL END,
                    CASE WHEN %s THEN COALESCE(e.qualified_for_grade2, 0) ELSE 0 END,
                    CASE WHEN %s THEN e.grade1_required_years ELSE NULL END,
                    CASE WHEN %s THEN e.grade1_eligibility_date ELSE NULL END,
                    0,
                    NOW(6),
                    NOW(6)
                FROM employees e
                LEFT JOIN employee_career_progression cp ON cp.employee_id = e.id
                WHERE cp.id IS NULL
                """.formatted(
                columnExists("employees", "qualified_for_permanent") ? "1=1" : "1=0",
                columnExists("employees", "permanent_qualification_date") ? "1=1" : "1=0",
                columnExists("employees", "permanent_confirmation_date") ? "1=1" : "1=0",
                columnExists("employees", "grade2_required_years") ? "1=1" : "1=0",
                columnExists("employees", "grade2_eligibility_date") ? "1=1" : "1=0",
                columnExists("employees", "qualified_for_grade2") ? "1=1" : "1=0",
                columnExists("employees", "grade1_required_years") ? "1=1" : "1=0",
                columnExists("employees", "grade1_eligibility_date") ? "1=1" : "1=0"
        ));
    }

    private void migrateCareerProgressionFromProgressionTables() {
        if (!tableExists("employee_confirmation")
                && !tableExists("employee_grade_progress")) {
            return;
        }

        if (tableExists("employee_confirmation")) {
            jdbcTemplate.execute("""
                    INSERT INTO employee_career_progression (
                        employee_id,
                        qualified_for_permanent,
                        permanent_qualification_date,
                        permanent_confirmation_date,
                        created_at,
                        updated_at
                    )
                    SELECT
                        c.employee_id,
                        COALESCE(c.qualified_for_permanent, 0),
                        c.permanent_qualification_date,
                        c.permanent_confirmation_date,
                        NOW(6),
                        NOW(6)
                    FROM employee_confirmation c
                    LEFT JOIN employee_career_progression cp
                        ON cp.employee_id = c.employee_id
                    WHERE cp.id IS NULL
                    """);
        }

        if (tableExists("employee_grade_progress")) {
            jdbcTemplate.execute("""
                    INSERT INTO employee_career_progression (
                        employee_id,
                        grade2_required_years,
                        grade2_eligibility_date,
                        qualified_for_grade2,
                        grade1_required_years,
                        grade1_eligibility_date,
                        qualified_for_grade1,
                        created_at,
                        updated_at
                    )
                    SELECT
                        gp.employee_id,
                        gp.grade2_required_years,
                        gp.grade2_eligibility_date,
                        COALESCE(gp.qualified_for_grade2, 0),
                        gp.grade1_required_years,
                        gp.grade1_eligibility_date,
                        COALESCE(gp.qualified_for_grade1, 0),
                        NOW(6),
                        NOW(6)
                    FROM employee_grade_progress gp
                    LEFT JOIN employee_career_progression cp
                        ON cp.employee_id = gp.employee_id
                    WHERE cp.id IS NULL
                    """);

            jdbcTemplate.execute("""
                    UPDATE employee_career_progression cp
                    JOIN employee_grade_progress gp ON gp.employee_id = cp.employee_id
                    SET
                        cp.grade2_required_years = gp.grade2_required_years,
                        cp.grade2_eligibility_date = gp.grade2_eligibility_date,
                        cp.qualified_for_grade2 = COALESCE(gp.qualified_for_grade2, 0),
                        cp.grade1_required_years = gp.grade1_required_years,
                        cp.grade1_eligibility_date = gp.grade1_eligibility_date,
                        cp.qualified_for_grade1 = COALESCE(gp.qualified_for_grade1, 0),
                        cp.updated_at = NOW(6)
                    """);
        }
    }

    private void migrateRequirementsFromEmployeeColumns() {
        if (!columnExists("employees", "eb_grade3_passed")) {
            return;
        }

        migrateRequirementColumn(
                "employees",
                "eb_grade3_passed",
                "EB_GRADE_3",
                null
        );
        migrateRequirementColumn(
                "employees",
                "language_qualification_passed",
                "GOVERNMENT_LANGUAGE_QUALIFICATION",
                null
        );
        migrateRequirementColumn(
                "employees",
                "medical_report_completed",
                "MEDICAL_REPORT",
                null
        );
        migrateRequirementColumn(
                "employees",
                "ol_approved",
                "OL_CERTIFICATE",
                null
        );
        migrateRequirementColumn(
                "employees",
                "al_approved",
                "AL_CERTIFICATE",
                null
        );
        migrateRequirementColumn(
                "employees",
                "degree_approved",
                "DEGREE_CERTIFICATE",
                null
        );
        migrateRequirementColumn(
                "employees",
                "other_qualification_approved",
                "OTHER_CERTIFICATE",
                "other_qualification_name"
        );
        migrateRequirementColumn(
                "employees",
                "birth_certificate_approved",
                "BIRTH_CERTIFICATE",
                null
        );
        migrateRequirementColumn(
                "employees",
                "eb_grade2_passed",
                "EB_GRADE_2",
                null
        );
        migrateRequirementColumn(
                "employees",
                "other_grade2_requirement_completed",
                "OTHER_GRADE_2_REQUIREMENT",
                null
        );
    }

    private void migrateRequirementsFromConfirmationTable() {
        if (!columnExists("employee_confirmation", "eb_grade3_passed")) {
            return;
        }

        migrateRequirementColumn(
                "employee_confirmation",
                "eb_grade3_passed",
                "EB_GRADE_3",
                null
        );
        migrateRequirementColumn(
                "employee_confirmation",
                "language_qualification_passed",
                "GOVERNMENT_LANGUAGE_QUALIFICATION",
                null
        );
        migrateRequirementColumn(
                "employee_confirmation",
                "medical_report_completed",
                "MEDICAL_REPORT",
                null
        );
        migrateRequirementColumn(
                "employee_confirmation",
                "ol_approved",
                "OL_CERTIFICATE",
                null
        );
        migrateRequirementColumn(
                "employee_confirmation",
                "al_approved",
                "AL_CERTIFICATE",
                null
        );
        migrateRequirementColumn(
                "employee_confirmation",
                "degree_approved",
                "DEGREE_CERTIFICATE",
                null
        );
        migrateRequirementColumn(
                "employee_confirmation",
                "other_qualification_approved",
                "OTHER_CERTIFICATE",
                "other_qualification_name"
        );
        migrateRequirementColumn(
                "employee_confirmation",
                "birth_certificate_approved",
                "BIRTH_CERTIFICATE",
                null
        );
    }

    private void migrateRequirementsFromGradeProgressTable() {
        if (!columnExists("employee_grade_progress", "eb_grade2_passed")) {
            return;
        }

        migrateRequirementColumn(
                "employee_grade_progress",
                "eb_grade2_passed",
                "EB_GRADE_2",
                null
        );
        migrateRequirementColumn(
                "employee_grade_progress",
                "other_grade2_requirement_completed",
                "OTHER_GRADE_2_REQUIREMENT",
                null
        );
    }

    private void migrateRequirementColumn(
            String sourceTable,
            String sourceColumn,
            String requirementType,
            String requirementNameColumn
    ) {
        if (!columnExists(sourceTable, sourceColumn)) {
            return;
        }

        String nameExpression = requirementNameColumn != null
                && columnExists(sourceTable, requirementNameColumn)
                ? requirementNameColumn
                : "NULL";
        String employeeIdColumn = "employees".equals(sourceTable) ? "id" : "employee_id";

        jdbcTemplate.execute("""
                INSERT INTO employee_requirements (
                    employee_id,
                    requirement_type,
                    requirement_name,
                    status,
                    completed_date,
                    created_at,
                    updated_at
                )
                SELECT
                    source.employee_id,
                    '%s',
                    source.requirement_name,
                    CASE WHEN COALESCE(source.completed, 0) = 1
                        THEN 'COMPLETED'
                        ELSE 'PENDING'
                    END,
                    CASE WHEN COALESCE(source.completed, 0) = 1
                        THEN CURRENT_DATE()
                        ELSE NULL
                    END,
                    NOW(6),
                    NOW(6)
                FROM (
                    SELECT %s AS employee_id, %s AS completed, %s AS requirement_name
                    FROM %s
                ) source
                LEFT JOIN employee_requirements existing
                    ON existing.employee_id = source.employee_id
                    AND existing.requirement_type = '%s'
                WHERE existing.id IS NULL
                """.formatted(
                requirementType,
                employeeIdColumn,
                sourceColumn,
                nameExpression,
                sourceTable,
                requirementType
        ));
    }

    private void dropOldEmployeeQualificationColumns() {
        String[] oldColumns = {
                "eb_grade3_passed",
                "eb_grade3passed",
                "language_qualification_passed",
                "medical_report_completed",
                "ol_approved",
                "al_approved",
                "degree_approved",
                "other_qualification_name",
                "other_qualification_approved",
                "birth_certificate_approved",
                "already_confirmed_permanent",
                "qualified_for_permanent",
                "permanent_qualification_date",
                "permanent_confirmation_date",
                "eb_grade2_passed",
                "eb_grade2passed",
                "other_grade2_requirement_completed",
                "other_grade2requirement_completed",
                "grade2_other_requirement_completed",
                "grade2_required_years",
                "grade2required_years",
                "grade2_eligibility_date",
                "grade2eligibility_date",
                "qualified_for_grade2",
                "grade1_required_years",
                "grade1required_years",
                "grade1_eligibility_date",
                "grade1eligibility_date"
        };

        for (String column : oldColumns) {
            dropColumnIfExists("employees", column);
        }
    }

    private void dropOldConfirmationRequirementColumns() {
        String[] oldColumns = {
                "eb_grade3_passed",
                "language_qualification_passed",
                "medical_report_completed",
                "ol_approved",
                "al_approved",
                "degree_approved",
                "other_qualification_name",
                "other_qualification_approved",
                "birth_certificate_approved"
        };

        for (String column : oldColumns) {
            dropColumnIfExists("employee_confirmation", column);
        }
    }

    private void dropOldGradeProgressRequirementColumns() {
        String[] oldColumns = {
                "eb_grade2_passed",
                "other_grade2_requirement_completed"
        };

        for (String column : oldColumns) {
            dropColumnIfExists("employee_grade_progress", column);
        }
    }

    private void dropOldProgressionTables() {
        dropTableIfExists("employee_confirmation");
        dropTableIfExists("employee_grade_progress");
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
        log.info("Dropped old column {}.{}", tableName, columnName);
    }

    private void addColumnIfMissing(
            String tableName,
            String columnName,
            String definition
    ) {
        if (columnExists(tableName, columnName)) {
            return;
        }

        jdbcTemplate.execute(
                "ALTER TABLE " + tableName + " ADD COLUMN "
                        + columnName + " " + definition
        );
        log.info("Added column {}.{}", tableName, columnName);
    }

    private void dropTableIfExists(String tableName) {
        if (!tableExists(tableName)) {
            return;
        }

        jdbcTemplate.execute("DROP TABLE " + tableName);
        log.info("Dropped old progression table {}", tableName);
    }

    private void removeLegacyRequirementRecords() {
        if (!tableExists("employee_requirements")) {
            return;
        }

        int removed = jdbcTemplate.update("""
                DELETE FROM employee_requirements
                WHERE requirement_type IN (
                    'OTHER_CERTIFICATE',
                    'OTHER_GRADE_2_REQUIREMENT'
                )
                """);

        if (removed > 0) {
            log.info("Removed {} legacy employee requirement record(s)", removed);
        }
    }

    private void addGradeAchievedDateColumns() {
        if (!tableExists("employee_career_progression")) {
            return;
        }

        addColumnIfMissing(
                "employee_career_progression",
                "grade3_achieved_date",
                "DATE NULL"
        );
        addColumnIfMissing(
                "employee_career_progression",
                "grade2_achieved_date",
                "DATE NULL"
        );
        addColumnIfMissing(
                "employee_career_progression",
                "grade1_achieved_date",
                "DATE NULL"
        );
        addColumnIfMissing(
                "employee_career_progression",
                "supra_achieved_date",
                "DATE NULL"
        );
        addColumnIfMissing(
                "employee_career_progression",
                "special_achieved_date",
                "DATE NULL"
        );

        jdbcTemplate.update("""
                UPDATE employee_career_progression
                SET grade3_achieved_date = permanent_confirmation_date
                WHERE permanent_confirmation_date IS NOT NULL
                  AND grade3_achieved_date IS NULL
                """);

        if (tableExists("employee_actions")) {
            jdbcTemplate.update("""
                    UPDATE employee_career_progression cp
                    JOIN (
                        SELECT employee_id, MAX(action_date) AS achieved_date
                        FROM employee_actions
                        WHERE (deleted IS NULL OR deleted = 0)
                          AND old_grade = 'III'
                          AND new_grade = 'II'
                        GROUP BY employee_id
                    ) latest ON latest.employee_id = cp.employee_id
                    SET cp.grade2_achieved_date = latest.achieved_date
                    WHERE cp.grade2_achieved_date IS NULL
                    """);

            jdbcTemplate.update("""
                    UPDATE employee_career_progression cp
                    JOIN (
                        SELECT employee_id, MAX(action_date) AS achieved_date
                        FROM employee_actions
                        WHERE (deleted IS NULL OR deleted = 0)
                          AND old_grade = 'II'
                          AND new_grade = 'I'
                        GROUP BY employee_id
                    ) latest ON latest.employee_id = cp.employee_id
                    SET cp.grade1_achieved_date = latest.achieved_date
                    WHERE cp.grade1_achieved_date IS NULL
                    """);

            jdbcTemplate.update("""
                    UPDATE employee_career_progression cp
                    JOIN (
                        SELECT employee_id, MAX(action_date) AS achieved_date
                        FROM employee_actions
                        WHERE (deleted IS NULL OR deleted = 0)
                          AND old_grade = 'I'
                          AND new_grade = 'SUPRA'
                        GROUP BY employee_id
                    ) latest ON latest.employee_id = cp.employee_id
                    SET cp.supra_achieved_date = latest.achieved_date
                    WHERE cp.supra_achieved_date IS NULL
                    """);

            jdbcTemplate.update("""
                    UPDATE employee_career_progression cp
                    JOIN (
                        SELECT employee_id, MAX(action_date) AS achieved_date
                        FROM employee_actions
                        WHERE (deleted IS NULL OR deleted = 0)
                          AND old_grade = 'I'
                          AND new_grade = 'SPECIAL'
                        GROUP BY employee_id
                    ) latest ON latest.employee_id = cp.employee_id
                    SET cp.special_achieved_date = latest.achieved_date
                    WHERE cp.special_achieved_date IS NULL
                    """);
        }

        if (tableExists("employees")) {
            jdbcTemplate.update("""
                    UPDATE employee_career_progression cp
                    JOIN employees e ON e.id = cp.employee_id
                    SET cp.grade2_achieved_date = e.appointment_date_to_present_class_grade
                    WHERE cp.grade2_achieved_date IS NULL
                      AND e.grade IN ('II', 'I')
                      AND e.appointment_date_to_present_class_grade IS NOT NULL
                    """);

            jdbcTemplate.update("""
                    UPDATE employee_career_progression cp
                    JOIN employees e ON e.id = cp.employee_id
                    SET cp.grade1_achieved_date = e.appointment_date_to_present_class_grade
                    WHERE cp.grade1_achieved_date IS NULL
                      AND e.grade = 'I'
                      AND e.appointment_date_to_present_class_grade IS NOT NULL
                    """);
        }
    }

    private void backfillDesignationRequirementCompletions() {
        if (!tableExists("employee_requirements")
                || !tableExists("designation_permanent_requirements")) {
            return;
        }

        backfillCustomRequirementCompletions(
                "designation_permanent_requirements",
                "CUSTOM_PERMANENT_REQUIREMENT"
        );
        backfillCustomRequirementCompletions(
                "designation_grade2_requirements",
                "CUSTOM_GRADE_2_REQUIREMENT"
        );
        backfillCustomRequirementCompletions(
                "designation_grade1_requirements",
                "CUSTOM_GRADE_1_REQUIREMENT"
        );
    }

    private void backfillCustomRequirementCompletions(
            String designationRequirementTable,
            String requirementType
    ) {
        if (!tableExists(designationRequirementTable)) {
            return;
        }

        jdbcTemplate.update("""
                INSERT INTO employee_requirements (
                    employee_id,
                    requirement_type,
                    requirement_name,
                    status,
                    created_at,
                    updated_at
                )
                SELECT
                    e.id,
                    ?,
                    d.requirement_name,
                    'PENDING',
                    NOW(6),
                    NOW(6)
                FROM employees e
                JOIN %s d ON d.designation_id = e.designation_id
                LEFT JOIN employee_requirements existing
                    ON existing.employee_id = e.id
                    AND existing.requirement_type = ?
                    AND LOWER(COALESCE(existing.requirement_name, ''))
                        = LOWER(d.requirement_name)
                WHERE existing.id IS NULL
                """.formatted(designationRequirementTable),
                requirementType,
                requirementType
        );
    }

    private void ensureDesignationCreatedAtColumn() {
        if (!tableExists("designations")) {
            return;
        }

        addColumnIfMissing(
                "designations",
                "created_at",
                "DATETIME NULL"
        );

        jdbcTemplate.update("""
                UPDATE designations
                SET created_at = DATE_ADD(
                    TIMESTAMP('1970-01-01 00:00:00'),
                    INTERVAL id SECOND
                )
                WHERE created_at IS NULL
                """);

        jdbcTemplate.execute("""
                ALTER TABLE designations
                MODIFY COLUMN created_at DATETIME NOT NULL
                """);
        log.info("Ensured designations.created_at column");
    }
}
