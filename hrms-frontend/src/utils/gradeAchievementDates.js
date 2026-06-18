const addYears = (date, years) => {
    if (!date || years == null) {
        return null;
    }

    const next = new Date(`${date}T00:00:00`);
    next.setFullYear(next.getFullYear() + Number(years));
    return next.toISOString().split("T")[0];
};

export const PROBATION_YEARS = 3;

export const getPermanentConfirmationMinDate = (firstAppointmentDate) =>
    addYears(firstAppointmentDate, PROBATION_YEARS);

export function hasCompletedProbationYears(employee) {
    const minDate = getPermanentConfirmationMinDate(
        employee?.dateOfFirstAppointment
    );
    if (!minDate) {
        return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today >= new Date(`${minDate}T00:00:00`);
}

export const getCareerHistoryGrade2MinDate = (timelineState, designation) => {
    const baseDate = timelineState?.firstAppointmentDate;
    const requiredYears = designation?.grade2RequiredYears;

    return addYears(baseDate, requiredYears);
};

export const getCareerHistoryGrade1MinDate = (timelineState, designation) => {
    const baseDate = timelineState?.grade2AchievedDate;
    const requiredYears = designation?.grade1RequiredYears;

    return addYears(baseDate, requiredYears);
};

export const getCareerHistoryEventMinDate = ({
    actionType,
    grade,
    timelineState,
    designation
}) => {
    if (actionType === "PERMANENT_CONFIRMATION") {
        return getPermanentConfirmationMinDate(timelineState?.firstAppointmentDate);
    }

    const currentGrade = timelineState?.grade;

    if (
        (actionType === "PROMOTION" || actionType === "ASSIGNMENT_GRADE_UPDATE")
        && currentGrade === "III"
        && grade === "II"
    ) {
        return getCareerHistoryGrade2MinDate(timelineState, designation);
    }

    if (
        (actionType === "PROMOTION" || actionType === "ASSIGNMENT_GRADE_UPDATE")
        && currentGrade === "II"
        && grade === "I"
    ) {
        return getCareerHistoryGrade1MinDate(timelineState, designation);
    }

    return null;
};

export const getGrade3AchievedDate = (employee) =>
    employee?.careerProgression?.grade3AchievedDate
    ?? employee?.careerProgression?.permanentConfirmationDate
    ?? null;

export const getGrade2AchievedDate = (employee) =>
    employee?.careerProgression?.grade2AchievedDate ?? null;

export const getGrade1AchievedDate = (employee) =>
    employee?.careerProgression?.grade1AchievedDate ?? null;

// Grade II service is counted from the first appointment date: a permanent
// recruit serves at Grade III from day one, even though the permanent
// confirmation only happens after the probation period.
export const getGrade2EligibilityDate = (employee, designation) => {
    const baseDate =
        employee?.dateOfFirstAppointment
        ?? getGrade3AchievedDate(employee);
    const requiredYears =
        designation?.grade2RequiredYears
        ?? employee?.careerProgression?.grade2RequiredYears;

    return addYears(baseDate, requiredYears);
};

export const getGrade1EligibilityDate = (employee, designation) => {
    const baseDate =
        getGrade2AchievedDate(employee)
        ?? employee?.appointmentDateToPresentClassGrade;
    const requiredYears =
        designation?.grade1RequiredYears
        ?? employee?.careerProgression?.grade1RequiredYears;

    return addYears(baseDate, requiredYears);
};

export const getMinimumPromotionEffectiveDate = (employee, oldGrade, newGrade, designation) => {
    if (oldGrade === "III" && newGrade === "II") {
        return getGrade2EligibilityDate(employee, designation);
    }

    if (oldGrade === "II" && newGrade === "I") {
        return getGrade1EligibilityDate(employee, designation);
    }

    return null;
};
