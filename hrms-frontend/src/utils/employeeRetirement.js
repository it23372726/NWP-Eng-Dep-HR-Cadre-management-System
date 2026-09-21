export const RETIREMENT_AGE_YEARS = 60;
export const RETIREMENT_WATCH_MONTHS = 12;
export const RETIREMENT_THIS_YEAR = "THIS_YEAR";

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

export function startOfLocalDay(dateValue = new Date()) {
    const parsed = dateValue instanceof Date
        ? new Date(dateValue.getTime())
        : parseLocalDate(dateValue);
    if (!parsed) {
        return null;
    }
    parsed.setHours(0, 0, 0, 0);
    return parsed;
}

export function addCalendarMonths(date, months) {
    const source = startOfLocalDay(date);
    if (!source || !Number.isFinite(Number(months))) {
        return null;
    }

    const year = source.getFullYear();
    const monthIndex = source.getMonth() + Number(months);
    const lastDay = new Date(year, monthIndex + 1, 0).getDate();
    const day = Math.min(source.getDate(), lastDay);
    return new Date(year, monthIndex, day);
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

export function isRetirementDateWithinMonths(retirementDate, months, today = new Date()) {
    const parsedMonths = Number(months);
    if (!Number.isFinite(parsedMonths) || parsedMonths < 0) {
        return false;
    }

    const start = startOfLocalDay(today);
    const retirement = startOfLocalDay(retirementDate);
    const end = addCalendarMonths(start, parsedMonths);
    if (!start || !retirement || !end) {
        return false;
    }

    return retirement >= start && retirement <= end;
}

export function isNearRetirement(dateOfBirth, today = new Date()) {
    return isRetirementDateWithinMonths(
        calculateRetirementDate(dateOfBirth),
        RETIREMENT_WATCH_MONTHS,
        today
    );
}

export function isRetiringThisCalendarYear(dateOfBirth, today = new Date()) {
    const retirement = calculateRetirementDate(dateOfBirth);
    const now = startOfLocalDay(today);
    if (!retirement || !now) {
        return false;
    }
    return retirement.getFullYear() === now.getFullYear();
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
