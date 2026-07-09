package com.nwpengdep.hrms.util;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;

public final class OrganizationSettingsDefaults {

    public static final String PRIMARY_DEPARTMENT_NAME =
            "N.W.P. Engineering Department";
    public static final String PROVINCIAL_COUNCIL_NAME =
            "North Western Provincial Council";
    public static final String DEPARTMENT_SHORT_NAME = "NWP Engineering";
    public static final String APPLICATION_NAME = "NWP HRMS";
    public static final String COUNCIL_LABEL = "N.W.P. Council";
    public static final List<String> DISTRICTS = List.of(
            "Kurunegala",
            "Puttalam"
    );

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
        return provincialCouncilName.trim()
                + " — "
                + departmentShortName.trim();
    }

    public static String reportHeaderUppercase(
            String provincialCouncilName,
            String primaryDepartmentName
    ) {
        String combined = provincialCouncilName.trim()
                + " "
                + primaryDepartmentName.trim();
        return combined.toUpperCase(Locale.ROOT)
                .replace("N.W.P.", "NORTH WESTERN PROVINCIAL")
                .replaceAll("\\s+", " ")
                .trim();
    }
}
