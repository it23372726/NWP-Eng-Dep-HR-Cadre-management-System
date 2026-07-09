package com.nwpengdep.hrms.constants;

import com.nwpengdep.hrms.util.OrganizationSettingsDefaults;

/**
 * Runtime-backed primary department identity.
 * Updated by {@link com.nwpengdep.hrms.service.OrganizationSettingsService}.
 */
public final class DepartmentConstants {

    /**
     * @deprecated Use {@link #getPrimaryDepartmentName()} — kept for compile compatibility.
     */
    @Deprecated
    public static final String NWP_ENGINEERING =
            OrganizationSettingsDefaults.PRIMARY_DEPARTMENT_NAME;

    private static volatile String primaryDepartmentName =
            OrganizationSettingsDefaults.PRIMARY_DEPARTMENT_NAME;

    private DepartmentConstants() {
    }

    public static void setPrimaryDepartmentName(String name) {
        if (name != null && !name.isBlank()) {
            primaryDepartmentName = name.trim();
        }
    }

    public static String getPrimaryDepartmentName() {
        return primaryDepartmentName;
    }

    public static boolean isPrimaryDepartment(String department) {
        return department != null
                && primaryDepartmentName.equalsIgnoreCase(department.trim());
    }

    /** @deprecated Use {@link #isPrimaryDepartment(String)} */
    @Deprecated
    public static boolean isNwpEngineering(String department) {
        return isPrimaryDepartment(department);
    }

    public static String normalize(String department) {
        if (department == null || department.isBlank()) {
            return null;
        }
        if (isPrimaryDepartment(department)) {
            return primaryDepartmentName;
        }
        return department.trim();
    }
}
