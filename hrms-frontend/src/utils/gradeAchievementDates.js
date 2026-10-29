import { isSupraExamPromotion } from "./supraPromotion.js";
const addYears = (date, years) => {
    if (!date) {
        return null;
    }

    const [year, month, day] = date.split("-").map(Number);
    const targetYear = year + Number(years || 0);
    const lastDay = new Date(Date.UTC(targetYear, month, 0)).getUTCDate();
    return `${targetYear}-${String(month).padStart(2, "0")}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
};

export const normalizeRequiredYears = (years) =>
    years == null || years === "" ? 0 : Number(years);

export const PROBATION_YEARS = 3;

export const getPermanentConfirmationMinDate = (firstAppointmentDate, years = PROBATION_YEARS) =>
    addYears(firstAppointmentDate, years);

export const completedInitialProbation = (start, confirmation) =>
    Boolean(start && confirmation && confirmation >= addYears(start, PROBATION_YEARS));

export const getServiceAppointmentProbationYears = (employee, appointmentDate) => {
    if (!appointmentDate) return PROBATION_YEARS;
    const periods = (employee?.serviceAppointments ?? []).filter(p => !p.superseded && !p.archivedSnapshot);
    const candidates = [...periods, { startDate: employee?.dateOfFirstAppointment,
        permanentConfirmationDate: employee?.careerProgression?.permanentConfirmationDate }];
    return candidates.some(p => p.startDate < appointmentDate
        && p.permanentConfirmationDate <= appointmentDate
        && completedInitialProbation(p.startDate, p.permanentConfirmationDate)) ? 1 : PROBATION_YEARS;
};

export const getEmployeeProbationMinDate = (employee) => employee?.probationEndDate ?? getPermanentConfirmationMinDate(
    employee?.dateOfFirstAppointment,
    employee?.currentServiceAppointmentKey && employee.currentServiceAppointmentKey !== "INITIAL"
        ? getServiceAppointmentProbationYears(employee, employee.dateOfFirstAppointment) : PROBATION_YEARS
);

// Replay only the supplied historical prefix; later confirmations cannot qualify an earlier appointment.
export const getProbationTimelineState = (events = []) => {
    let firstAppointmentDate = null;
    let completed = false;
    let probationYears = PROBATION_YEARS;
    for (const event of events) {
        if (event.deleted) continue;
        if (event.actionType === "SERVICE_APPOINTMENT") {
            probationYears = completed ? 1 : PROBATION_YEARS;
            firstAppointmentDate = event.actionDate;
        } else if (event.actionType === "NEW_APPOINTMENT" || event.trainingGraduation) {
            firstAppointmentDate = event.actionDate;
            probationYears = PROBATION_YEARS;
        } else if (event.actionType === "PERMANENT_CONFIRMATION") {
            completed ||= completedInitialProbation(firstAppointmentDate, event.actionDate);
        }
    }
    return { probationYears, completedInitialProbation: completed, firstAppointmentDate };
};

export function hasCompletedProbationYears(employee) {
    const minDate = getEmployeeProbationMinDate(employee);
    if (!minDate) {
        return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today >= new Date(`${minDate}T00:00:00`);
}

export const getCareerHistoryGrade2MinDate = (timelineState, designation) => {
    const baseDate = timelineState?.firstAppointmentDate;
    const requiredYears = designation?.service?.grade2RequiredYears;

    return addYears(baseDate, requiredYears);
};

export const getCareerHistoryGrade1MinDate = (timelineState, designation) => {
    const baseDate = timelineState?.grade2AchievedDate;
    const requiredYears = designation?.service?.grade1RequiredYears;

    return addYears(baseDate, requiredYears);
};

export const getCareerHistorySupraMinDate = (timelineState, designation) => {
    const baseDate = timelineState?.grade1AchievedDate;
    const requiredYears = designation?.service?.supraRequiredYears;

    return addYears(baseDate, requiredYears);
};

export const getCareerHistorySpecialMinDate = (timelineState, designation) => {
    const baseDate = timelineState?.grade1AchievedDate;
    const requiredYears = designation?.service?.specialRequiredYears;

    return addYears(baseDate, requiredYears);
};

export const getCareerHistoryEventMinDate = ({
    actionType,
    grade,
    timelineState,
    designation
}) => {
    if (actionType === "PROMOTION" && grade === "Supra"
        && isSupraExamPromotion(timelineState?.grade, designation)) return null;
    if (actionType === "PERMANENT_CONFIRMATION") {
        return getPermanentConfirmationMinDate(timelineState?.firstAppointmentDate, timelineState?.probationYears);
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

    if (
        (actionType === "PROMOTION" || actionType === "ASSIGNMENT_GRADE_UPDATE")
        && currentGrade === "I"
        && grade === "Supra"
    ) {
        return getCareerHistorySupraMinDate(timelineState, designation);
    }

    if (
        (actionType === "PROMOTION" || actionType === "ASSIGNMENT_GRADE_UPDATE")
        && currentGrade === "I"
        && grade === "Special"
    ) {
        return getCareerHistorySpecialMinDate(timelineState, designation);
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

export const getSupraAchievedDate = (employee) =>
    employee?.careerProgression?.supraAchievedDate ?? null;

export const getSpecialAchievedDate = (employee) =>
    employee?.careerProgression?.specialAchievedDate ?? null;

// Grade II service is counted from the first appointment date: a permanent
// recruit serves at Grade III from day one, even though the permanent
// confirmation only happens after the probation period.
export const getGrade2EligibilityDate = (employee, designation) => {
    const baseDate =
        employee?.dateOfFirstAppointment
        ?? getGrade3AchievedDate(employee);
    const service =
        designation?.service
        ?? employee?.service
        ?? employee?.designation?.service;
    const requiredYears =
        service?.grade2RequiredYears
        ?? employee?.careerProgression?.grade2RequiredYears;

    return addYears(baseDate, requiredYears);
};

export const getGrade1EligibilityDate = (employee, designation) => {
    const baseDate =
        getGrade2AchievedDate(employee)
        ?? employee?.appointmentDateToPresentClassGrade;
    const service =
        designation?.service
        ?? employee?.service
        ?? employee?.designation?.service;
    const requiredYears =
        service?.grade1RequiredYears
        ?? employee?.careerProgression?.grade1RequiredYears;

    return addYears(baseDate, requiredYears);
};

export const getSupraEligibilityDate = (employee, designation) => {
    const baseDate =
        getGrade1AchievedDate(employee)
        ?? employee?.appointmentDateToPresentClassGrade;
    const service =
        designation?.service
        ?? employee?.service
        ?? employee?.designation?.service;
    const requiredYears =
        service?.supraRequiredYears
        ?? employee?.careerProgression?.supraRequiredYears;

    return addYears(baseDate, requiredYears);
};

export const getSpecialEligibilityDate = (employee, designation) => {
    const baseDate =
        getGrade1AchievedDate(employee)
        ?? employee?.appointmentDateToPresentClassGrade;
    const service =
        designation?.service
        ?? employee?.service
        ?? employee?.designation?.service;
    const requiredYears =
        service?.specialRequiredYears
        ?? employee?.careerProgression?.specialRequiredYears;

    return addYears(baseDate, requiredYears);
};

export const getMinimumPromotionEffectiveDate = (employee, oldGrade, newGrade, designation) => {
    if (oldGrade === "III" && newGrade === "II") {
        return getGrade2EligibilityDate(employee, designation);
    }

    if (oldGrade === "II" && newGrade === "I") {
        return getGrade1EligibilityDate(employee, designation);
    }

    if (oldGrade === "I" && newGrade === "Supra") {
        return getSupraEligibilityDate(employee, designation);
    }

    if (oldGrade === "I" && newGrade === "Special") {
        return getSpecialEligibilityDate(employee, designation);
    }

    return null;
};
