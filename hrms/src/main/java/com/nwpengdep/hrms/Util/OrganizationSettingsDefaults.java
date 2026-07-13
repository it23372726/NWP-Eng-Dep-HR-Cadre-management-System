package com.nwpengdep.hrms.util;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;

public final class OrganizationSettingsDefaults {

    public static final String RENAME_MIGRATE = "MIGRATE_EXISTING";
    public static final String RENAME_KEEP = "KEEP_EXISTING";

    private OrganizationSettingsDefaults() {
    }

    public static List<String> normalizeDistricts(List<String> districts) {
        if (districts == null || districts.isEmpty()) {
            throw new RuntimeException("At least one district is required");
        }

        LinkedHashSet<String> unique = new LinkedHashSet<>();
        for (String district : districts) {
            if (district == null || district.isBlank()) {
                continue;
            }
            String trimmed = district.trim();
            boolean exists = unique.stream()
                    .anyMatch(existing -> existing.equalsIgnoreCase(trimmed));
            if (!exists) {
                unique.add(trimmed);
            }
        }

        if (unique.isEmpty()) {
            throw new RuntimeException("At least one district is required");
        }

        return new ArrayList<>(unique);
    }

    public static String reportHeaderSubtitle(
            String provincialCouncilName,
            String departmentShortName
    ) {
        String council = provincialCouncilName != null ? provincialCouncilName.trim() : "";
        String department = departmentShortName != null ? departmentShortName.trim() : "";
        if (council.isEmpty() && department.isEmpty()) {
            return "";
        }
        if (council.isEmpty()) {
            return department;
        }
        if (department.isEmpty()) {
            return council;
        }
        return council + " — " + department;
    }

    public static String reportHeaderUppercase(
            String provincialCouncilName,
            String primaryDepartmentName
    ) {
        String council = provincialCouncilName != null ? provincialCouncilName.trim() : "";
        String department = primaryDepartmentName != null ? primaryDepartmentName.trim() : "";
        String combined = (council + " " + department).trim();
        if (combined.isEmpty()) {
            return "";
        }
        return combined.toUpperCase(Locale.ROOT)
                .replaceAll("\\s+", " ")
                .trim();
    }
}
