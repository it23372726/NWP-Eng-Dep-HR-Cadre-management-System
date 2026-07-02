/**
 * Display helpers for the security audit trail.
 * Field grouping follows common audit frameworks (ISO 27001 A.12.4, OWASP logging):
 * Who (actor), What (event), When (timestamp), Where (source), Which (resource), Outcome.
 */

export const AUDIT_ACTIONS = [
    "CREATE",
    "UPDATE",
    "DELETE",
    "LOGIN",
    "LOGIN_FAILED",
    "LOGOUT",
    "EXPORT",
    "VIEW",
    "DOWNLOAD",
    "SYSTEM"
];

export const AUDIT_MODULES = [
    "AUTH",
    "EMPLOYEE_PROFILE",
    "MASTER_DATA",
    "LIFECYCLE",
    "REPORT",
    "AUDIT",
    "SYSTEM"
];

export const AUDIT_STATUSES = ["SUCCESS", "FAILURE"];

export const AUDIT_ACTION_LABELS = {
    CREATE: "Create",
    UPDATE: "Update",
    DELETE: "Delete",
    LOGIN: "Sign In",
    LOGIN_FAILED: "Sign In Failed",
    LOGOUT: "Sign Out",
    EXPORT: "Export",
    VIEW: "View",
    DOWNLOAD: "Download",
    SYSTEM: "System"
};

export const AUDIT_MODULE_LABELS = {
    AUTH: "Authentication",
    EMPLOYEE_PROFILE: "Employee Profile",
    MASTER_DATA: "Master Data",
    LIFECYCLE: "Employee Lifecycle",
    REPORT: "Reports",
    AUDIT: "Audit Trail",
    SYSTEM: "System"
};

export const AUDIT_STATUS_LABELS = {
    SUCCESS: "Success",
    FAILURE: "Failure"
};

export const AUDIT_ACTION_COLORS = {
    CREATE: "success",
    UPDATE: "info",
    DELETE: "error",
    LOGIN: "default",
    LOGIN_FAILED: "error",
    LOGOUT: "default",
    EXPORT: "warning",
    VIEW: "primary",
    DOWNLOAD: "secondary",
    SYSTEM: "default"
};

export const AUDIT_STATUS_COLORS = {
    SUCCESS: "success",
    FAILURE: "error"
};

const FIELD_LABEL_OVERRIDES = {
    employeeId: "Employee ID",
    nic: "NIC",
    tin: "TIN",
    epfNo: "EPF Number",
    dateOfBirth: "Date of Birth",
    dateOfAppointment: "Date of Appointment",
    userRole: "Role",
    ipAddress: "Source IP",
    clientHost: "Client Host",
    userAgent: "User Agent",
    requestPath: "Request Path",
    httpMethod: "HTTP Method",
    correlationId: "Correlation ID",
    contentHash: "Integrity Hash",
    activitySummary: "Activity Summary",
    activityType: "Activity Type",
    effectiveDate: "Effective Date",
    actionDate: "Action Date",
    employeeName: "Employee Name",
    employeeNic: "Employee NIC",
    employeeStatus: "Employee Status",
    reason: "Reason",
    remarks: "Remarks",
    confirmationDate: "Confirmation Date",
    promotionDate: "Promotion Date",
    transferDate: "Transfer Date",
    appointmentDate: "Appointment Date",
    collectedDate: "Collected Date",
    toDepartment: "To Department",
    toOffice: "To Office",
    office: "Office",
    department: "Department",
    grade: "Grade",
    entityType: "Resource Type",
    entityId: "Resource ID",
    entityLabel: "Resource Label"
};

export function formatAuditTimestamp(value) {
    if (!value) return "—";
    return new Date(value).toLocaleString("en-LK", {
        timeZone: "Asia/Colombo",
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
    });
}

export function formatAuditAction(action) {
    return AUDIT_ACTION_LABELS[action] || action || "—";
}

export function formatAuditModule(module) {
    return AUDIT_MODULE_LABELS[module] || module || "—";
}

export function formatAuditStatus(status) {
    return AUDIT_STATUS_LABELS[status] || status || "—";
}

export function humanizeFieldName(key) {
    if (!key) return "—";
    if (FIELD_LABEL_OVERRIDES[key]) {
        return FIELD_LABEL_OVERRIDES[key];
    }
    return key
        .replace(/([A-Z])/g, " $1")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase())
        .trim();
}

export function formatAuditValue(value) {
    if (value === null || value === undefined || value === "") {
        return "—";
    }
    if (typeof value === "boolean") {
        return value ? "Yes" : "No";
    }
    if (typeof value === "object") {
        return JSON.stringify(value, null, 2);
    }
    return String(value);
}

export function formatActivitySummary(log) {
    if (!log) return "—";
    if (log.activitySummary) {
        return log.activitySummary;
    }
    if (log.newValues?.activitySummary) {
        return log.newValues.activitySummary;
    }
    return "—";
}

export function formatResourceSummary(log) {
    if (!log) return "—";
    if (log.entityLabel) {
        const activity = formatActivitySummary(log);
        if (activity !== "—" && log.entityLabel.startsWith(activity)) {
            const remainder = log.entityLabel.slice(activity.length).replace(/^\s*[—-]\s*/, "");
            return remainder || log.entityLabel;
        }
        return log.entityLabel;
    }
    if (log.entityType && log.entityId) {
        return `${log.entityType} #${log.entityId}`;
    }
    return log.entityType || "—";
}

export function formatResourceMeta(log) {
    if (!log?.entityType) return null;
    const parts = [log.entityType];
    if (log.entityId) {
        parts.push(`#${log.entityId}`);
    }
    return parts.join(" ");
}

/**
 * Builds rows for a standard before / after change table.
 */
export function buildChangeRows(oldValues = {}, newValues = {}, changedFields = []) {
    const hiddenKeys = new Set(["activityType", "activitySummary"]);
    const keys = new Set([
        ...Object.keys(oldValues || {}),
        ...Object.keys(newValues || {}),
        ...(changedFields || [])
    ]);

    return Array.from(keys)
        .filter((field) => !hiddenKeys.has(field))
        .sort((a, b) => humanizeFieldName(a).localeCompare(humanizeFieldName(b)))
        .map((field) => {
            const oldValue = oldValues?.[field];
            const newValue = newValues?.[field];
            const hasOld = oldValue !== undefined && oldValue !== null;
            const hasNew = newValue !== undefined && newValue !== null;
            const changed = changedFields?.includes(field)
                || (hasOld && hasNew && formatAuditValue(oldValue) !== formatAuditValue(newValue))
                || (hasOld && !hasNew)
                || (!hasOld && hasNew);

            let changeType = "unchanged";
            if (changed) {
                if (!hasOld && hasNew) changeType = "added";
                else if (hasOld && !hasNew) changeType = "removed";
                else changeType = "modified";
            }

            return {
                field,
                label: humanizeFieldName(field),
                oldValue: formatAuditValue(oldValue),
                newValue: formatAuditValue(newValue),
                changeType,
                changed
            };
        })
        .filter((row) => row.changeType !== "unchanged" || row.oldValue !== "—" || row.newValue !== "—");
}
