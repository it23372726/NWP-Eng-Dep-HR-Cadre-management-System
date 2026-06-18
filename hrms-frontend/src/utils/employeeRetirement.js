export const RETIREMENT_AGE_YEARS = 60;

export function parseLocalDate(dateValue) {
    if (!dateValue) {
        return null;
    }

    const parsed = new Date(
        typeof dateValue === "string" && !dateValue.includes("T")
            ? `${dateValue}T00:00:00`
            : dateValue
    );

    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function calculateRetirementDate(dateOfBirth) {
    const birthDate = parseLocalDate(dateOfBirth);
    if (!birthDate) {
        return null;
    }

    const retirementDate = new Date(birthDate);
    retirementDate.setFullYear(retirementDate.getFullYear() + RETIREMENT_AGE_YEARS);
    return retirementDate;
}

export function formatEmployeeDate(dateValue) {
    const parsed = dateValue instanceof Date
        ? dateValue
        : parseLocalDate(dateValue);

    if (!parsed) {
        return "—";
    }

    return parsed.toLocaleDateString("en-GB");
}
