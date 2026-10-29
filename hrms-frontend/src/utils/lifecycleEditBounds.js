import {
    formatTimelineDate,
    getNextEventDateForEdit,
    getPreviousEventDateForEdit,
    maxIsoDate,
    minIsoDate,
    todayIsoDate
} from "./timelineDates";
import { PROBATION_YEARS, getProbationTimelineState } from "./gradeAchievementDates";

const subtractYears = (date, years) => {
    if (!date || years == null || years === "") {
        return null;
    }

    const [year, month, day] = date.split("-").map(Number);
    const targetYear = year - Number(years);
    if (Number.isNaN(targetYear)) {
        return null;
    }
    const lastDay = new Date(Date.UTC(targetYear, month, 0)).getUTCDate();
    return `${targetYear}-${String(month).padStart(2, "0")}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
};

const isGradeStep = (action, fromGrade, toGrade) => {
    if (!action) {
        return false;
    }
    if (action.actionType !== "PROMOTION" && action.actionType !== "ASSIGNMENT_GRADE_UPDATE") {
        return false;
    }
    return action.oldGrade === fromGrade && action.newGrade === toGrade;
};

const compareEvents = (left, right) => {
    const dateCompare = (left.actionDate || "").localeCompare(right.actionDate || "");
    if (dateCompare !== 0) {
        return dateCompare;
    }
    return (left.id ?? 0) - (right.id ?? 0);
};

/**
 * Date bounds for editing a lifecycle event in place.
 * min = previous event (callers may tighten further with own eligibility).
 * max = earliest of: next event, today, and downstream caps (e.g. Grade I − N years).
 */
export function getLifecycleEditDateBounds({
    action,
    actionHistory,
    serviceRules
} = {}) {
    if (!action?.id) {
        return { minDate: null, maxDate: todayIsoDate(), maxReason: null };
    }

    const previousEventDate = getPreviousEventDateForEdit(actionHistory, action.id);
    const nextEventDate = getNextEventDateForEdit(actionHistory, action.id);
    const today = todayIsoDate();

    let maxDate = minIsoDate(nextEventDate, today);
    let maxReason = nextEventDate && maxDate === nextEventDate
        ? `Cannot be later than the next event (${formatTimelineDate(nextEventDate)}).`
        : `Cannot be later than today (${formatTimelineDate(today)}).`;

    const sorted = [...(actionHistory ?? [])]
        .filter((event) => event?.actionDate && !(event.actionType === "TRANSFER_IN" && event.autoCreated))
        .sort(compareEvents);
    const index = sorted.findIndex((event) => event.id === action.id);
    const laterEvents = index >= 0 ? sorted.slice(index + 1) : [];

    const tightenMax = (candidate, reason) => {
        if (!candidate) {
            return;
        }
        if (!maxDate || candidate < maxDate) {
            maxDate = candidate;
            maxReason = reason;
        }
    };

    const grade2Years = serviceRules?.grade2RequiredYears;
    const grade1Years = serviceRules?.grade1RequiredYears;
    const supraYears = serviceRules?.supraRequiredYears;
    const specialYears = serviceRules?.specialRequiredYears;

    const isFirstAppointmentClock = action.actionType === "NEW_APPOINTMENT"
        || action.actionType === "SERVICE_APPOINTMENT"
        || Boolean(action.trainingGraduation);

    if (isFirstAppointmentClock) {
        const probationYears = action.actionType === "SERVICE_APPOINTMENT"
            ? getProbationTimelineState(sorted.slice(0, index + 1)).probationYears : PROBATION_YEARS;
        const nextServiceIndex = laterEvents.findIndex(event => event.actionType === "SERVICE_APPOINTMENT");
        const periodEvents = nextServiceIndex < 0 ? laterEvents : laterEvents.slice(0, nextServiceIndex);
        const laterConfirmation = periodEvents.find(
            (event) => event.actionType === "PERMANENT_CONFIRMATION"
        );
        if (laterConfirmation) {
            tightenMax(
                subtractYears(laterConfirmation.actionDate, probationYears),
                `Permanent confirmation on ${formatTimelineDate(laterConfirmation.actionDate)} requires ${probationYears} year(s) after this appointment. Move that confirmation first, or keep this date on or before ${formatTimelineDate(subtractYears(laterConfirmation.actionDate, probationYears))}.`
            );
        }

        const laterGrade2 = laterEvents.find((event) => isGradeStep(event, "III", "II"));
        if (laterGrade2 && grade2Years != null) {
            const cap = subtractYears(laterGrade2.actionDate, grade2Years);
            tightenMax(
                cap,
                `Grade II on ${formatTimelineDate(laterGrade2.actionDate)} requires ${grade2Years} year(s) after this appointment. Move that Grade II event first, or keep this date on or before ${formatTimelineDate(cap)}.`
            );
        }
    }

    if (isGradeStep(action, "III", "II")) {
        const laterGrade1 = laterEvents.find((event) => isGradeStep(event, "II", "I"));
        if (laterGrade1 && grade1Years != null) {
            const cap = subtractYears(laterGrade1.actionDate, grade1Years);
            tightenMax(
                cap,
                `Grade I on ${formatTimelineDate(laterGrade1.actionDate)} requires ${grade1Years} year(s) after this Grade II. Move that Grade I event first, or keep this date on or before ${formatTimelineDate(cap)}.`
            );
        }
    }

    if (isGradeStep(action, "II", "I")) {
        const laterSupra = laterEvents.find((event) => isGradeStep(event, "I", "Supra"));
        if (laterSupra && supraYears != null) {
            const cap = subtractYears(laterSupra.actionDate, supraYears);
            tightenMax(
                cap,
                `Supra on ${formatTimelineDate(laterSupra.actionDate)} requires ${supraYears} year(s) after this Grade I. Move that event first, or keep this date on or before ${formatTimelineDate(cap)}.`
            );
        }
        const laterSpecial = laterEvents.find((event) => isGradeStep(event, "I", "Special"));
        if (laterSpecial && specialYears != null) {
            const cap = subtractYears(laterSpecial.actionDate, specialYears);
            tightenMax(
                cap,
                `Special on ${formatTimelineDate(laterSpecial.actionDate)} requires ${specialYears} year(s) after this Grade I. Move that event first, or keep this date on or before ${formatTimelineDate(cap)}.`
            );
        }
    }

    return {
        minDate: previousEventDate,
        maxDate,
        maxReason,
        nextEventDate,
        previousEventDate
    };
}

export function lifecycleEditDateHelperText({
    value,
    minDate,
    maxDate,
    maxReason,
    minHelper
} = {}) {
    if (value && minDate && value < minDate) {
        return minHelper
            || `Effective date cannot be earlier than ${formatTimelineDate(minDate)}.`;
    }
    if (value && maxDate && value > maxDate) {
        return maxReason
            || `Effective date cannot be later than ${formatTimelineDate(maxDate)}.`;
    }
    if (maxReason) {
        return maxReason;
    }
    return minHelper;
}

export function recordedDateKept(value, recordedDate) {
    return Boolean(value && recordedDate && value === recordedDate);
}

export function isLifecycleEditDateInvalid(value, minDate, maxDate) {
    if (!value) {
        return false;
    }
    if (minDate && value < minDate) {
        return true;
    }
    if (maxDate && value > maxDate) {
        return true;
    }
    return false;
}

export { subtractYears, maxIsoDate };
