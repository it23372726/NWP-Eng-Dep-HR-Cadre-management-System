package com.nwpengdep.hrms.util;

import com.nwpengdep.hrms.entity.Grade;
import com.nwpengdep.hrms.entity.RequirementType;
import com.nwpengdep.hrms.entity.ServiceType;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

public final class DefaultServiceRequirements {

    public static final List<String> PERMANENT_NAMES = List.of(
            "EB Grade III Passed",
            "Government Language Qualification Passed",
            "Medical Report Completed",
            "O/L Approved",
            "A/L Approved",
            "Degree Approved",
            "Birth Certificate Approved"
    );

    public static final List<String> GRADE2_NAMES = List.of(
            "EB Grade II Passed"
    );

    public static final List<String> GRADE1_NAMES = List.of(
            "EB Grade I Passed"
    );

    public static final List<String> SUPRA_NAMES = List.of(
            "Supra Grade Examination Passed"
    );

    public static final List<String> SPECIAL_NAMES = List.of(
            "Masters Degree Completed"
    );

    private static final Map<RequirementType, RequirementMigration> LEGACY_MIGRATIONS =
            buildLegacyMigrations();

    private DefaultServiceRequirements() {
    }

    public static List<String> permanentNamesFor(ServiceType service) {
        return PERMANENT_NAMES;
    }

    public static List<String> grade2NamesFor(ServiceType service) {
        return GRADE2_NAMES;
    }

    public static List<String> grade1NamesFor(ServiceType service) {
        return GRADE1_NAMES;
    }

    public static List<String> supraNamesFor(ServiceType service) {
        if (service == null || !allowsSupra(service)) {
            return List.of();
        }
        return SUPRA_NAMES;
    }

    public static List<String> specialNamesFor(ServiceType service) {
        if (service == null || !allowsSpecial(service)) {
            return List.of();
        }
        return SPECIAL_NAMES;
    }

    public static RequirementMigration migrationFor(RequirementType type) {
        return LEGACY_MIGRATIONS.get(type);
    }

    public static Set<RequirementType> legacyFixedTypes() {
        return LEGACY_MIGRATIONS.keySet();
    }

    public static boolean allowsSupra(ServiceType service) {
        return service != null
                && service.getAllowedGrades() != null
                && service.getAllowedGrades().contains(Grade.SUPRA);
    }

    public static boolean allowsSpecial(ServiceType service) {
        return service != null
                && service.getAllowedGrades() != null
                && service.getAllowedGrades().contains(Grade.SPECIAL);
    }

    private static Map<RequirementType, RequirementMigration> buildLegacyMigrations() {
        Map<RequirementType, RequirementMigration> migrations = new LinkedHashMap<>();
        migrations.put(
                RequirementType.EB_GRADE_3,
                new RequirementMigration(
                        RequirementType.CUSTOM_PERMANENT_REQUIREMENT,
                        "EB Grade III Passed"
                )
        );
        migrations.put(
                RequirementType.GOVERNMENT_LANGUAGE_QUALIFICATION,
                new RequirementMigration(
                        RequirementType.CUSTOM_PERMANENT_REQUIREMENT,
                        "Government Language Qualification Passed"
                )
        );
        migrations.put(
                RequirementType.MEDICAL_REPORT,
                new RequirementMigration(
                        RequirementType.CUSTOM_PERMANENT_REQUIREMENT,
                        "Medical Report Completed"
                )
        );
        migrations.put(
                RequirementType.OL_CERTIFICATE,
                new RequirementMigration(
                        RequirementType.CUSTOM_PERMANENT_REQUIREMENT,
                        "O/L Approved"
                )
        );
        migrations.put(
                RequirementType.AL_CERTIFICATE,
                new RequirementMigration(
                        RequirementType.CUSTOM_PERMANENT_REQUIREMENT,
                        "A/L Approved"
                )
        );
        migrations.put(
                RequirementType.DEGREE_CERTIFICATE,
                new RequirementMigration(
                        RequirementType.CUSTOM_PERMANENT_REQUIREMENT,
                        "Degree Approved"
                )
        );
        migrations.put(
                RequirementType.BIRTH_CERTIFICATE,
                new RequirementMigration(
                        RequirementType.CUSTOM_PERMANENT_REQUIREMENT,
                        "Birth Certificate Approved"
                )
        );
        migrations.put(
                RequirementType.EB_GRADE_2,
                new RequirementMigration(
                        RequirementType.CUSTOM_GRADE_2_REQUIREMENT,
                        "EB Grade II Passed"
                )
        );
        migrations.put(
                RequirementType.EB_GRADE_1,
                new RequirementMigration(
                        RequirementType.CUSTOM_GRADE_1_REQUIREMENT,
                        "EB Grade I Passed"
                )
        );
        migrations.put(
                RequirementType.SUPRA_REQUIREMENT,
                new RequirementMigration(
                        RequirementType.CUSTOM_SUPRA_REQUIREMENT,
                        "Supra Grade Examination Passed"
                )
        );
        migrations.put(
                RequirementType.MASTERS_DEGREE,
                new RequirementMigration(
                        RequirementType.CUSTOM_SPECIAL_REQUIREMENT,
                        "Masters Degree Completed"
                )
        );
        return Map.copyOf(migrations);
    }

    public record RequirementMigration(
            RequirementType customType,
            String defaultName
    ) {
    }
}
