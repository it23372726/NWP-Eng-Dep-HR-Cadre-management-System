const addYears = (date, years) => {
    if (!date || years == null) {
        return null;
    }

    const next = new Date(`${date}T00:00:00`);
    next.setFullYear(next.getFullYear() + Number(years));
    return next.toISOString().split("T")[0];
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
