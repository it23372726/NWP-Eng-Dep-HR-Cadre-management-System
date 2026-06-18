export const GRADES = ["None", "III", "II", "I", "Supra", "Special"];

export const DISTRICTS = ["Kurunegala", "Puttalam"];

export const NWP_ENGINEERING_DEPARTMENT = "N.W.P. Engineering Department";

export function normalizeDistrictLabel(value) {
    if (value === null || value === undefined) {
        return "";
    }

    const text = String(value?.label ?? value).trim();
    if (!text) {
        return "";
    }

    const upper = text.toUpperCase();
    if (upper === "KURUNEGALA") {
        return "Kurunegala";
    }
    if (upper === "PUTTALAM") {
        return "Puttalam";
    }

    return text;
}

export function toApiDistrict(value) {
    const label = normalizeDistrictLabel(value);
    return label || null;
}

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

export const GRADE_PROMOTION_FILTER_OPTIONS = [
    { value: "ALL", label: "All grades" },
    { value: "QUALIFIED_GRADE_3_TO_2", label: "Qualified: Grade III → II" },
    { value: "QUALIFIED_GRADE_2_TO_1", label: "Qualified: Grade II → I" }
];

export const RETIREMENT_FILTER_OPTIONS = [
    { value: "", label: "All" },
    { value: "6", label: "Retiring within 6 months" },
    { value: "12", label: "Retiring within 12 months" },
    { value: "24", label: "Retiring within 24 months" },
    { value: "60", label: "Retiring within 5 years" }
];

export const DISTRICT_FILTER_OPTIONS = [
    { value: "", label: "All districts" },
    ...DISTRICTS.map((district) => ({ value: district, label: district }))
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
    ASSIGNMENT_GRADE_UPDATE: "Assignment / Grade Update",
    PERMANENT_CONFIRMATION: "Permanent Confirmation",
    OFFICE_CHANGE: "Office Change",
    RETIREMENT_OR_RESIGNATION: "Retirement / Resignation",
    DEATH: "Death",
    DISMISSAL: "Dismissal"
};

export const REQUIREMENT_STATUS = {
    PENDING: "PENDING",
    COMPLETED: "COMPLETED",
    REJECTED: "REJECTED"
};

export const REQUIREMENT_TYPE_LABELS = {
    EB_GRADE_3: "EB Grade III Exam Passed",
    EB_GRADE_2: "EB Grade II Passed",
    GOVERNMENT_LANGUAGE_QUALIFICATION: "Government Language Qualification",
    MEDICAL_REPORT: "Medical Report Completed",
    OL_CERTIFICATE: "O/L Approved",
    AL_CERTIFICATE: "A/L Approved",
    DEGREE_CERTIFICATE: "Degree Approved",
    OTHER_CERTIFICATE: "Other Qualification Approved",
    BIRTH_CERTIFICATE: "Birth Certificate Approved",
    OTHER_GRADE_2_REQUIREMENT: "Other Grade II Requirement Completed",
    EB_GRADE_1: "EB Grade I Passed",
    SUPRA_REQUIREMENT: "Supra Grade Requirement",
    SPECIAL_GRADE_REQUIREMENT: "Special Grade Requirement",
    TRAINING_PROGRAM: "Training Program",
    PROFESSIONAL_QUALIFICATION: "Professional Qualification",
    CUSTOM_PERMANENT_REQUIREMENT: "Custom Permanent Requirement",
    CUSTOM_GRADE_2_REQUIREMENT: "Custom Grade II Requirement",
    CUSTOM_GRADE_1_REQUIREMENT: "Custom Grade I Requirement"
};

export const FIXED_PERMANENT_REQUIREMENTS = [
    { requirementType: "EB_GRADE_3", label: "EB Grade III Passed" },
    {
        requirementType: "GOVERNMENT_LANGUAGE_QUALIFICATION",
        label: "Government Language Qualification Passed"
    },
    { requirementType: "MEDICAL_REPORT", label: "Medical Report Completed" },
    { requirementType: "OL_CERTIFICATE", label: "O/L Approved" },
    { requirementType: "AL_CERTIFICATE", label: "A/L Approved" },
    { requirementType: "DEGREE_CERTIFICATE", label: "Degree Approved" },
    { requirementType: "BIRTH_CERTIFICATE", label: "Birth Certificate Approved" }
];

export const FIXED_GRADE2_REQUIREMENTS = [
    { requirementType: "EB_GRADE_2", label: "EB Grade II Passed" }
];

export const FIXED_GRADE1_REQUIREMENTS = [
    { requirementType: "EB_GRADE_1", label: "EB Grade I Passed" }
];

export const QUALIFICATION_FILTER_OPTIONS = [
    { value: "", label: "All qualifications" },
    { value: "ANY_PENDING", label: "Any pending qualification" },
    { value: "PENDING_PERMANENT", label: "Pending permanent requirements" },
    { value: "PENDING_GRADE_2", label: "Pending Grade II requirements" },
    { value: "PENDING_GRADE_1", label: "Pending Grade I requirements" },
    ...FIXED_PERMANENT_REQUIREMENTS.map((requirement) => ({
        value: requirement.requirementType,
        label: `Pending: ${requirement.label}`
    })),
    ...FIXED_GRADE2_REQUIREMENTS.map((requirement) => ({
        value: requirement.requirementType,
        label: `Pending: ${requirement.label}`
    })),
    ...FIXED_GRADE1_REQUIREMENTS.map((requirement) => ({
        value: requirement.requirementType,
        label: `Pending: ${requirement.label}`
    })),
    {
        value: "CUSTOM_PERMANENT_REQUIREMENT",
        label: "Pending: custom permanent requirement"
    },
    {
        value: "CUSTOM_GRADE_2_REQUIREMENT",
        label: "Pending: custom Grade II requirement"
    },
    {
        value: "CUSTOM_GRADE_1_REQUIREMENT",
        label: "Pending: custom Grade I requirement"
    }
];

export function getRequirement(employee, requirementType) {
    return (employee?.requirements || []).find(
        (requirement) => requirement.requirementType === requirementType
    );
}

export function isRequirementCompleted(employee, requirementType) {
    return getRequirement(employee, requirementType)?.status === "COMPLETED";
}

export const STATUS_COLORS = {
    ACTIVE: "success",
    INACTIVE: "error"
};

function formatWorkplace(department, office) {
    if (department && office) {
        return `${department} — ${office}`;
    }
    return department || office || null;
}

export function getActionDetailLines(action) {
    if (!action) {
        return [];
    }

    const lines = [];
    const type = action.actionType;

    if (type === "PROMOTION" || type === "ASSIGNMENT_GRADE_UPDATE") {
        if (action.oldDesignationName && action.newDesignationName) {
            lines.push({
                label: "Designation",
                value: `${action.oldDesignationName} → ${action.newDesignationName}`
            });
        } else if (action.newDesignationName) {
            lines.push({ label: "Designation", value: action.newDesignationName });
        }

        if (action.oldGrade && action.newGrade) {
            lines.push({
                label: "Grade",
                value: `${action.oldGrade} → ${action.newGrade}`
            });
        } else if (action.newGrade) {
            lines.push({ label: "Grade", value: action.newGrade });
        }

        if (action.newServiceLevelName) {
            lines.push({
                label: "Service Level",
                value: action.newServiceLevelName
            });
        }
    } else if (type === "TRANSFER_OUT") {
        const from = formatWorkplace(action.fromDepartment, action.fromOffice)
            || action.transferredFrom;
        const to = formatWorkplace(action.toDepartment, action.toOffice)
            || action.transferredTo;

        if (from) {
            lines.push({ label: "From", value: from });
        }
        if (to) {
            lines.push({ label: "To", value: to });
        }
        const district = action.district?.label ?? action.district;
        if (district) {
            lines.push({ label: "District", value: district });
        }
        lines.push({
            value: "Transfer-in recorded automatically",
            caption: true
        });
    } else if (type === "OFFICE_CHANGE") {
        const from = formatWorkplace(action.fromDepartment, action.fromOffice);
        const to = formatWorkplace(action.toDepartment, action.toOffice)
            || action.toOffice;
        const district = action.district?.label ?? action.district;

        if (from) {
            lines.push({ label: "From", value: from });
        }
        if (to) {
            lines.push({ label: "To", value: to });
        }
        if (district) {
            lines.push({ label: "District", value: district });
        }
    } else if (type === "NEW_APPOINTMENT" || type === "TRANSFER_IN") {
        const workplace = formatWorkplace(action.department, action.office);
        const district = action.district?.label ?? action.district;

        if (workplace) {
            lines.push({ label: "Workplace", value: workplace });
        }
        if (district) {
            lines.push({ label: "District", value: district });
        }
        if (action.transferredFrom) {
            lines.push({
                label: "Transferred from",
                value: action.transferredFrom
            });
        }
    } else if (type === "DISMISSAL" && action.reason) {
        lines.push({ label: "Reason", value: action.reason });
    }

    return lines;
}

export function formatActionDetails(action) {
    const lines = getActionDetailLines(action).filter((line) => !line.caption);

    if (!lines.length) {
        return "—";
    }

    return lines
        .map((line) => (line.label ? `${line.label}: ${line.value}` : line.value))
        .join(" · ");
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

export const EMPLOYEE_PHOTO_SIZE = 120;
export const EMPLOYEE_PHOTO_ACCEPT = "image/jpeg,image/png";
export const EMPLOYEE_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
