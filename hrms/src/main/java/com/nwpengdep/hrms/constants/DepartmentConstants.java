package com.nwpengdep.hrms.constants;

/**
 * Runtime-backed primary department identity.
 * Updated by {@link com.nwpengdep.hrms.service.OrganizationSettingsService}.
 */
public final class DepartmentConstants {

    /**
     * @deprecated Use {@link #getPrimaryDepartmentName()} — kept for compile compatibility.
     */
    @Deprecated
    public static final String NWP_ENGINEERING = "";

    private static volatile String primaryDepartmentName = "";

    private DepartmentConstants() {
    }

    public static void setPrimaryDepartmentName(String name) {
        if (name != null && !name.isBlank()) {
            primaryDepartmentName = name.trim();
        } else {
            primaryDepartmentName = "";
        }
    }

    public static String getPrimaryDepartmentName() {
        return primaryDepartmentName;
    }

    public static boolean isPrimaryDepartment(String department) {
        return department != null
                && !primaryDepartmentName.isBlank()
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
