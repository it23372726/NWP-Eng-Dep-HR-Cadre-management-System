export const GRADES = ["None", "III", "II", "I", "Supra", "Special"];

export const DISTRICTS = ["Kurunegala", "Puttalam"];

export const EMPLOYMENT_TYPES = [
    { value: "PERMANENT", label: "Permanent" },
    { value: "ACTING", label: "Acting" },
    { value: "CONTRACT", label: "Contract" },
    { value: "CASUAL", label: "Casual" },
    { value: "SUBSTITUTE", label: "Substitute" }
];

export const PERMANENT_STATUS_OPTIONS = [
    { value: "ALL", label: "All" },
    { value: "PROBATION", label: "Probation" },
    { value: "QUALIFIED_FOR_PERMANENT", label: "Qualified" },
    { value: "PERMANENT", label: "Permanent" }
];

export const PERMANENT_STATUS_LABELS = {
    PROBATION: "Probation",
    QUALIFIED_FOR_PERMANENT: "Qualified",
    PERMANENT: "Permanent"
};

export const PERMANENT_STATUS_COLORS = {
    PROBATION: "warning",
    QUALIFIED_FOR_PERMANENT: "info",
    PERMANENT: "success"
};

export const EMPLOYEE_ENTRY_TYPES = [
    { value: "NEW_EMPLOYEE", label: "New Employee" },
    { value: "TRANSFER_IN", label: "Transfer In Employee" }
];

export const ACTION_TYPE_LABELS = {
    NEW_APPOINTMENT: "New Appointment",
    TRANSFER_IN: "Transfer In",
    TRANSFER_OUT: "Transfer Out",
    PROMOTION: "Promotion",
    PERMANENT_CONFIRMATION: "Permanent Confirmation",
    RETIREMENT_OR_RESIGNATION: "Retirement / Resignation",
    DEATH: "Death",
    DISMISSAL: "Dismissal"
};

export const STATUS_COLORS = {
    ACTIVE: "success",
    INACTIVE: "error"
};

export function formatActionDetails(action) {
    const parts = [];

    if (action.oldDesignationName && action.newDesignationName) {
        parts.push(
            `${action.oldDesignationName} → ${action.newDesignationName}`
        );
    } else if (action.newDesignationName) {
        parts.push(action.newDesignationName);
    } else if (action.oldDesignationName) {
        parts.push(action.oldDesignationName);
    }

    if (action.transferredFrom) {
        parts.push(`From: ${action.transferredFrom}`);
    }

    if (action.transferredTo) {
        parts.push(`To: ${action.transferredTo}`);
    }

    if (action.reason) {
        parts.push(`Reason: ${action.reason}`);
    }

    if (action.actionType === "PERMANENT_CONFIRMATION") {
        parts.push(`Confirmed on: ${action.actionDate}`);
    }

    return parts.length ? parts.join(" · ") : "—";
}

export function validateDesignationAssignment(employee, designation) {
    if (!designation) {
        return null;
    }

    if (employee?.employmentType && employee.employmentType !== "PERMANENT") {
        return null;
    }

    if (!employee?.grade || employee.grade === "None" || employee.grade === "NONE") {
        return "Employee grade is required";
    }

    if (!employee?.serviceLevel?.id) {
        return "Employee service level is required";
    }

    const allowedGrades = designation.allowedGrades || [];

    if (!allowedGrades.includes(employee.grade)) {
        return `Grade "${employee.grade}" is not allowed for ${designation.designationName}. Allowed: ${allowedGrades.join(", ")}`;
    }

    if (
        designation.serviceLevel?.id
        && designation.serviceLevel.id !== employee.serviceLevel.id
    ) {
        return `Service level must be "${designation.serviceLevel.levelName}" for ${designation.designationName}`;
    }

    return null;
}

export function getApiErrorMessage(error) {
    const data = error?.response?.data;

    if (typeof data === "string" && data.trim()) {
        return data;
    }

    if (data && typeof data === "object") {
        const first = Object.values(data)[0];
        if (typeof first === "string") {
            return first;
        }
    }

    return error?.message || "Request failed";
}
