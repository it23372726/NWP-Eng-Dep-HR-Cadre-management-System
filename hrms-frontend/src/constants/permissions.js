export const PERMISSIONS = [
    "DASHBOARD",
    "EMPLOYEE_VIEW",
    "EMPLOYEE_EDIT",
    "ORGANIZATION",
    "REPORTS",
    "ADMINISTRATIONS"
];

export const PERMISSION_LABELS = {
    DASHBOARD: "Dashboard",
    EMPLOYEE_VIEW: "Employee-View",
    EMPLOYEE_EDIT: "Employee-Edit",
    ORGANIZATION: "Organization",
    REPORTS: "Reports",
    ADMINISTRATIONS: "Administrations"
};

export const PERMISSION_ROUTE_MAP = {
    DASHBOARD: "/dashboard",
    EMPLOYEE_VIEW: "/employees",
    EMPLOYEE_EDIT: "/employees",
    ORGANIZATION: "/designations",
    REPORTS: "/vacancies",
    ADMINISTRATIONS: "/users"
};

export const EMPLOYEE_PERMISSIONS = ["EMPLOYEE_VIEW", "EMPLOYEE_EDIT"];

export function isSuperAdmin(user) {
    return user?.role === "SUPER_ADMIN";
}

export function hasPermission(user, permission) {
    if (!user) {
        return false;
    }

    if (isSuperAdmin(user)) {
        return true;
    }

    return Array.isArray(user.permissions) && user.permissions.includes(permission);
}

export function hasAnyPermission(user, permissions) {
    if (!user || !Array.isArray(permissions) || permissions.length === 0) {
        return false;
    }

    if (isSuperAdmin(user)) {
        return true;
    }

    return permissions.some((permission) => hasPermission(user, permission));
}

export function canViewEmployees(user) {
    return hasAnyPermission(user, EMPLOYEE_PERMISSIONS);
}

export function canEditEmployees(user) {
    return hasPermission(user, "EMPLOYEE_EDIT");
}

export function getDefaultRouteForUser(user) {
    if (!user) {
        return "/";
    }

    if (hasPermission(user, "DASHBOARD")) {
        return "/dashboard";
    }

    if (canViewEmployees(user)) {
        return "/employees";
    }

    for (const permission of PERMISSIONS) {
        if (hasPermission(user, permission)) {
            return PERMISSION_ROUTE_MAP[permission];
        }
    }

    return "/dashboard";
}
