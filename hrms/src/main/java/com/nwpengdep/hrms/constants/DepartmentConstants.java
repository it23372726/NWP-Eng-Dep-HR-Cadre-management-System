package com.nwpengdep.hrms.constants;

public final class DepartmentConstants {

    public static final String NWP_ENGINEERING =
            "N.W.P. Engineering Department";

    private DepartmentConstants() {
    }

    public static boolean isNwpEngineering(String department) {
        return department != null
                && NWP_ENGINEERING.equalsIgnoreCase(department.trim());
    }

    public static String normalize(String department) {
        if (department == null || department.isBlank()) {
            return null;
        }
        if (isNwpEngineering(department)) {
            return NWP_ENGINEERING;
        }
        return department.trim();
    }
}
