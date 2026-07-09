export const ROLES = [
    "SUPER_ADMIN",
    "SUBJECT_OFF_EMP",
    "SUBJECT_OFF_ORG",
    "VIEW_ONLY"
];

export const CONFIGURABLE_ROLES = [
    "SUBJECT_OFF_EMP",
    "SUBJECT_OFF_ORG",
    "VIEW_ONLY"
];

export const ROLE_DESCRIPTIONS = {
    SUPER_ADMIN: "Full access to all modules and role management",
    SUBJECT_OFF_EMP: "Employee operations (permissions configurable)",
    SUBJECT_OFF_ORG: "Organization operations (permissions configurable)",
    VIEW_ONLY: "Configurable module access"
};

export const ROLE_COLORS = {
    SUPER_ADMIN: "error",
    SUBJECT_OFF_EMP: "primary",
    SUBJECT_OFF_ORG: "warning",
    VIEW_ONLY: "default"
};

export const DEFAULT_ASSIGNABLE_ROLE = "SUBJECT_OFF_EMP";
