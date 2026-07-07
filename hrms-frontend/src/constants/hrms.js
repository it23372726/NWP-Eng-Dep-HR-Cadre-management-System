export const GRADES = ["None", "III", "II", "I", "Supra", "Special"];

export const DISTRICTS = ["Kurunegala", "Puttalam"];

export const NWP_ENGINEERING_DEPARTMENT = "N.W.P. Engineering Department";

export const OTHER_DESIGNATION_VALUE = "OTHER";

export const isOtherDesignation = (id) =>
    id === OTHER_DESIGNATION_VALUE || id === "OTHER";

export const resolveDisplayDesignationName = (entity) =>
    entity?.specialDesignationName
    ?? entity?.recordedDesignationName
    ?? entity?.newDesignationName
    ?? entity?.designationName
    ?? entity?.designation?.designationName
    ?? null;

export const resolveEmployeeDesignationName = (employee) =>
    employee?.specialDesignationName
    ?? employee?.recordedDesignationName
    ?? employee?.designation?.designationName
    ?? null;

export const validateCustomDesignationAssignment = ({
    grade,
    serviceLevelId,
    service
}) => {
    if (!grade || grade === "None" || grade === "NONE") {
        return "Employee grade is required";
    }

    if (!serviceLevelId) {
        return "Service level is required";
    }

    if (!service) {
        return "Employee service is required";
    }

    const serviceGrades = service.allowedGrades || [];

    if (!serviceGrades.length) {
        return `Service "${service.serviceCode || "—"}" has no maximum achievable grades configured`;
    }

    if (!serviceGrades.includes(grade)) {
        return `Grade "${grade}" exceeds the maximum achievable grade for service ${service.serviceCode}. Service maximum: ${serviceGrades.join(", ")}`;
    }

    return null;
};

export const isPermanentEmployee = (employmentType) =>
    employmentType === "PERMANENT";

export const isSystemPendingEmployee = (employee, actionHistory = null) =>
    employee?.employmentType === "PERMANENT"
    && employee?.status === "ACTIVE"
    && (actionHistory == null
        ? !employee?.dateOfFirstAppointment && !employee?.designation
        : actionHistory.length === 0);

export const isContractEmployee = (employmentType) =>
    employmentType === "CONTRACT";

export const TRAINING_FORM_TYPE = "TRAINING";

export const isTrainingFormType = (employmentType) =>
    employmentType === TRAINING_FORM_TYPE;

export const isTrainingEmployee = (employee) =>
    (employee?.employmentType == null || employee?.employmentType === "")
    && employee?.serviceLevel?.levelName?.toLowerCase() === "training";

export const isTrainingServiceLevel = (serviceLevel) =>
    serviceLevel?.levelName?.toLowerCase() === "training";

export const TRAINING_PERIOD_OPTIONS = [
    { value: "1", label: "1 year training" },
    { value: "2", label: "2 years training" }
];

export function formatTrainingPeriodYears(years) {
    if (Number(years) === 2) {
        return "2 years";
    }
    if (Number(years) === 1) {
        return "1 year";
    }

    return "—";
}

export const canShowDependentDetails = (employeeOrForm) =>
    isPermanentEmployee(employeeOrForm?.employmentType);

export const canShowPrivateVehicleFields = (employmentType) =>
    isPermanentEmployee(employmentType);

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
    { value: "SUBSTITUTE", label: "Substitute" },
    { value: TRAINING_FORM_TYPE, label: "Training" }
];

export function getEmploymentTypeLabel(employmentType, employee = null) {
    if (isTrainingEmployee(employee)) {
        return "Training";
    }

    if (isTrainingFormType(employmentType)) {
        return "Training";
    }

    const match = EMPLOYMENT_TYPES.find((type) => type.value === employmentType);
    return match?.label ?? employmentType ?? "";
}

export const EMPLOYEE_TYPE_FILTER_OPTIONS = [
    { value: "ALL", label: "All" },
    { value: "PROBATION", label: "Probation" },
    { value: "QUALIFIED_FOR_PERMANENT", label: "Qualified to permanent" },
    { value: "PERMANENT", label: "Permanent" },
    { value: "ACTING", label: "Acting" },
    { value: "CONTRACT", label: "Contract" },
    { value: "CASUAL", label: "Casual" },
    { value: "SUBSTITUTE", label: "Substitute" },
    { value: "TRAINING", label: "Training" }
];

/** @deprecated Use EMPLOYEE_TYPE_FILTER_OPTIONS */
export const PERMANENT_STATUS_OPTIONS = EMPLOYEE_TYPE_FILTER_OPTIONS;

export const PERMANENT_TRACK_FILTER_VALUES = [
    "PROBATION",
    "QUALIFIED_FOR_PERMANENT",
    "PERMANENT"
];

export const NON_PERMANENT_EMPLOYMENT_FILTER_VALUES = [
    "ACTING",
    "CONTRACT",
    "CASUAL",
    "SUBSTITUTE"
];

export const EMPLOYMENT_TYPE_CHIP_STYLES = {
    ACTING: { bgcolor: "#7C3AED", color: "#FFFFFF" },
    CONTRACT: { bgcolor: "#475569", color: "#FFFFFF" },
    CASUAL: { bgcolor: "#94A3B8", color: "#FFFFFF" },
    SUBSTITUTE: { bgcolor: "#0D9488", color: "#FFFFFF" },
    TRAINING: { bgcolor: "#2563EB", color: "#FFFFFF" }
};

export const GRADE_PROMOTION_FILTER_OPTIONS = [
    { value: "ALL", label: "All grades" },
    { value: "QUALIFIED_GRADE_3_TO_2", label: "Qualified: Grade III → II" },
    { value: "QUALIFIED_GRADE_2_TO_1", label: "Qualified: Grade II → I" },
    { value: "QUALIFIED_GRADE_1_TO_SUPRA", label: "Qualified: Grade I → Supra" },
    { value: "QUALIFIED_GRADE_1_TO_SPECIAL", label: "Qualified: Grade I → Special" }
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
    QUALIFIED_FOR_PERMANENT: "Qualified to permanent",
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
    DISMISSAL: "Dismissal",
    VACATION_OF_POST: "Vacation of Post"
};

export function isPromotionTransferOut(action) {
    if (!action || action.actionType !== "PROMOTION") {
        return false;
    }
    if (action.transferringOut) {
        return true;
    }
    return Boolean(
        action.fromDepartment === NWP_ENGINEERING_DEPARTMENT
        && action.department
        && action.department !== NWP_ENGINEERING_DEPARTMENT
    );
}

export function getActionTypeLabel(action) {
    if (!action?.actionType) {
        return "";
    }
    if (action.trainingAppointment) {
        return "New Trainee Appointment";
    }
    if (action.actionType === "PROMOTION") {
        return isPromotionTransferOut(action)
            ? "Promotion / Transfer Out"
            : "Promotion / New Appointment";
    }
    return ACTION_TYPE_LABELS[action.actionType] || action.actionType;
}

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
    SUPRA_REQUIREMENT: "Supra Grade Examination Passed",
    MASTERS_DEGREE: "Masters Degree Completed",
    SPECIAL_GRADE_REQUIREMENT: "Special Grade Requirement",
    TRAINING_EXAM: "Training Examination Passed",
    TRAINING_PROGRAM: "Training Program",
    PROFESSIONAL_QUALIFICATION: "Professional Qualification",
    CUSTOM_PERMANENT_REQUIREMENT: "Custom Permanent Requirement",
    CUSTOM_GRADE_2_REQUIREMENT: "Custom Grade II Requirement",
    CUSTOM_GRADE_1_REQUIREMENT: "Custom Grade I Requirement",
    CUSTOM_SUPRA_REQUIREMENT: "Custom Supra Requirement",
    CUSTOM_SPECIAL_REQUIREMENT: "Custom Special Requirement"
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

export const FIXED_SUPRA_REQUIREMENTS = [
    { requirementType: "SUPRA_REQUIREMENT", label: "Supra Grade Examination Passed" }
];

export const FIXED_SPECIAL_REQUIREMENTS = [
    { requirementType: "MASTERS_DEGREE", label: "Masters Degree Completed" }
];

export function serviceAllowsSupra(service) {
    return (service?.allowedGrades || []).includes("Supra");
}

export function serviceAllowsSpecial(service) {
    return (service?.allowedGrades || []).includes("Special");
}

export function getServiceTerminalPath(service) {
    if (serviceAllowsSupra(service)) {
        return "supra";
    }
    if (serviceAllowsSpecial(service)) {
        return "special";
    }
    return null;
}

export const TRAINING_EXAM_REQUIREMENT = {
    requirementType: "TRAINING_EXAM",
    label: "Training Examination Passed"
};

export const FIXED_TRAINING_GRADUATION_REQUIREMENTS = [
    TRAINING_EXAM_REQUIREMENT
];

const formatTrainingDate = (date) =>
    date ? new Date(`${date}T00:00:00`).toLocaleDateString("en-GB") : "—";

export function getTrainingPeriodYears(employee) {
    const years = Number(employee?.trainingPeriodYears);
    return years === 2 ? 2 : 1;
}

export function getTrainingPeriodEndDate(employee) {
    const start = employee?.dateOfFirstAppointment;
    if (!start) {
        return null;
    }

    const date = new Date(`${start}T00:00:00`);
    date.setFullYear(date.getFullYear() + getTrainingPeriodYears(employee));
    return date.toISOString().split("T")[0];
}

export function hasTrainingPeriodCompleted(employee, asOfDate = null) {
    const endDate = getTrainingPeriodEndDate(employee);
    if (!endDate) {
        return false;
    }

    const compareDate = asOfDate
        ? new Date(`${asOfDate}T00:00:00`)
        : new Date();
    const end = new Date(`${endDate}T00:00:00`);

    return compareDate >= end;
}

export function getTrainingGraduationBlockReason(employee) {
    if (!isTrainingEmployee(employee)) {
        return null;
    }

    const examPassed = isRequirementCompleted(employee, "TRAINING_EXAM");
    const periodCompleted = hasTrainingPeriodCompleted(employee);

    if (examPassed && periodCompleted) {
        return null;
    }

    const parts = [];

    if (!examPassed) {
        parts.push("pass the training examination");
    }

    if (!periodCompleted) {
        const years = getTrainingPeriodYears(employee);
        const endDate = getTrainingPeriodEndDate(employee);

        parts.push(
            endDate
                ? `complete the ${years}-year training period (eligible from ${formatTrainingDate(endDate)})`
                : `complete the ${years}-year training period from first appointment date`
        );
    }

    return `Must ${parts.join(" and ")} before permanent appointment`;
}

export function isTrainingGraduationEligible(employee) {
    if (!isTrainingEmployee(employee)) {
        return false;
    }

    if (employee?.canAppointAsPermanent != null) {
        return Boolean(employee.canAppointAsPermanent);
    }

    return isRequirementCompleted(employee, "TRAINING_EXAM")
        && hasTrainingPeriodCompleted(employee);
}

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
        const newName = resolveDisplayDesignationName(action);
        const oldName = action.oldDesignationName;

        if (oldName && newName && oldName !== newName) {
            lines.push({
                label: "Designation",
                value: `${oldName} → ${newName}`
            });
        } else if (newName && type !== "ASSIGNMENT_GRADE_UPDATE") {
            lines.push({ label: "Designation", value: newName });
        }

        if (action.oldGrade && action.newGrade && action.oldGrade !== action.newGrade) {
            lines.push({
                label: "Grade",
                value: `${action.oldGrade} → ${action.newGrade}`
            });
        } else if (action.newGrade && type !== "PROMOTION") {
            lines.push({ label: "Grade", value: action.newGrade });
        }

        if (action.newServiceLevelName) {
            lines.push({
                label: "Service Level",
                value: action.newServiceLevelName
            });
        }

        if (type === "PROMOTION" && isPromotionTransferOut(action)) {
            const from = formatWorkplace(action.fromDepartment, action.fromOffice);
            const to = formatWorkplace(action.department, action.office)
                || formatWorkplace(action.toDepartment, action.toOffice);

            if (from) {
                lines.push({ label: "From", value: from });
            }
            if (to) {
                lines.push({ label: "To", value: to });
            }
        }
    } else if (type === "TRANSFER_OUT") {
        const newName = resolveDisplayDesignationName(action);
        const oldName = action.oldDesignationName;

        if (oldName && newName && oldName !== newName) {
            lines.push({
                label: "Designation",
                value: `${oldName} → ${newName}`
            });
        } else if (newName) {
            lines.push({ label: "Designation", value: newName });
        }

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
        const designationName = resolveDisplayDesignationName(action);
        if (designationName) {
            lines.push({ label: "Designation", value: designationName });
        }

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
    } else if (type === "VACATION_OF_POST" && action.reason) {
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

export function getServiceRules(designation) {
    return designation?.service ?? null;
}

export const resolveEmployeeService = (employee) =>
    employee?.service ?? employee?.designation?.service ?? null;

export const getEmployeeServiceRules = (employee) =>
    resolveEmployeeService(employee);

export function getServiceRequirementList(designation, field) {
    return getServiceRules(designation)?.[field] ?? [];
}

export function validateDesignationAssignment(employee, designation) {
    if (!designation) {
        return null;
    }

    if (employee?.employmentType && !isPermanentEmployee(employee.employmentType)) {
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
        return `Grade "${employee.grade}" is not eligible for ${designation.designationName}. Eligible: ${allowedGrades.join(", ")}`;
    }

    const service = getServiceRules(designation);
    const serviceGrades = service?.allowedGrades || [];

    if (!serviceGrades.length) {
        return `Service "${service?.serviceCode || "—"}" has no maximum achievable grades configured`;
    }

    if (!serviceGrades.includes(employee.grade)) {
        return `Grade "${employee.grade}" exceeds the maximum achievable grade for service ${service.serviceCode}. Service maximum: ${serviceGrades.join(", ")}`;
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
