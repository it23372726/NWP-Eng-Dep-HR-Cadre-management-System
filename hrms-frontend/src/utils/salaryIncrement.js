import { formatMonthDayDisplay } from "./monthDayDate";

export const UPCOMING_WINDOW_DAYS = 30;

export const formatSalaryIncrementDate = (date) =>
    date ? new Date(date).toLocaleDateString("en-GB") : "—";

export const todayInputValue = () => new Date().toISOString().slice(0, 10);

const parseMonthDay = (value) => {
    if (!value || !/^\d{2}-\d{2}$/.test(value)) {
        return null;
    }

    const [month, day] = value.split("-").map(Number);
    return { month, day };
};

export const resolveDueDate = (incrementDate, year) => {
    const monthDay = parseMonthDay(incrementDate);
    if (!monthDay) {
        return null;
    }

    return `${year}-${String(monthDay.month).padStart(2, "0")}-${String(monthDay.day).padStart(2, "0")}`;
};

const isEligibleEmployee = (employee) => {
    if (employee?.status !== "ACTIVE" || employee?.employmentType === "CONTRACT") {
        return false;
    }

    if (!employee?.incremantDate || !employee?.dateOfFirstAppointment) {
        return false;
    }

    return Boolean(resolveDueDate(employee.incremantDate, new Date(employee.dateOfFirstAppointment).getFullYear()));
};

const resolveNextDue = (employee, today = todayInputValue()) => {
    if (!isEligibleEmployee(employee)) {
        return null;
    }

    const firstAppt = employee.dateOfFirstAppointment;
    const firstApptYear = new Date(`${firstAppt}T00:00:00`).getFullYear();
    const lastDueYear = employee.salaryIncrementLastDueYear ?? 0;
    const todayDate = new Date(`${today}T00:00:00`);

    for (let year = firstApptYear; year <= todayDate.getFullYear(); year += 1) {
        const due = resolveDueDate(employee.incremantDate, year);
        if (!due) {
            continue;
        }

        const dueDate = new Date(`${due}T00:00:00`);
        const firstApptDate = new Date(`${firstAppt}T00:00:00`);

        if (dueDate < firstApptDate || dueDate > todayDate) {
            continue;
        }

        if (year > lastDueYear) {
            return { year, dueDate: due };
        }
    }

    let nextYear = lastDueYear > 0 ? lastDueYear + 1 : firstApptYear;
    if (lastDueYear === 0) {
        const firstDue = resolveDueDate(employee.incremantDate, firstApptYear);
        if (firstDue && today < firstDue) {
            nextYear = firstApptYear;
        } else {
            nextYear = todayDate.getFullYear() + 1;
        }
    }

    const nextDue = resolveDueDate(employee.incremantDate, nextYear);
    return nextDue ? { year: nextYear, dueDate: nextDue } : null;
};

export const classifyIncrementDashboardStatus = (employee, today = todayInputValue()) => {
    const nextDue = resolveNextDue(employee, today);
    if (!nextDue) {
        return null;
    }

    if (nextDue.dueDate <= today) {
        return "PENDING";
    }

    const upcomingLimit = new Date(`${today}T00:00:00`);
    upcomingLimit.setDate(upcomingLimit.getDate() + UPCOMING_WINDOW_DAYS);

    if (nextDue.dueDate <= upcomingLimit.toISOString().slice(0, 10)) {
        return "UPCOMING";
    }

    return null;
};

export const matchesIncrementStatus = (employee, status) => {
    if (!status) {
        return true;
    }

    return classifyIncrementDashboardStatus(employee) === status;
};

export const getMinSalaryIncrementRecordDate = (status) => status?.nextDueDate ?? null;

export const getMinSalaryIncrementCatchUpDate = (status) =>
    status?.catchUpTargetDueDate ?? null;

export const getMinSalaryIncrementEditDate = (status, employee) => {
    if (!employee?.salaryIncrementLastDueYear || !employee?.incremantDate) {
        return null;
    }

    return resolveDueDate(employee.incremantDate, employee.salaryIncrementLastDueYear);
};

export const validateSalaryIncrementRecordDate = (doneDate, status) => {
    if (!doneDate) {
        return "Increment done date is required.";
    }

    const today = todayInputValue();

    if (doneDate > today) {
        return "Increment done date cannot be in the future.";
    }

    if (status?.nextDueDate && doneDate < status.nextDueDate) {
        return `Increment done date cannot be before the due date (${formatSalaryIncrementDate(status.nextDueDate)}).`;
    }

    return null;
};

export const validateSalaryIncrementCatchUpDate = (doneDate, status) => {
    if (!doneDate) {
        return "Increment done date is required.";
    }

    const today = todayInputValue();

    if (doneDate > today) {
        return "Increment done date cannot be in the future.";
    }

    if (status?.catchUpTargetDueDate && doneDate < status.catchUpTargetDueDate) {
        return `Increment done date cannot be before the due date (${formatSalaryIncrementDate(status.catchUpTargetDueDate)}).`;
    }

    return null;
};

export const validateSalaryIncrementEditDate = (doneDate, status, employee) => {
    if (!doneDate) {
        return "Increment done date is required.";
    }

    const today = todayInputValue();

    if (doneDate > today) {
        return "Increment done date cannot be in the future.";
    }

    const minDate = getMinSalaryIncrementEditDate(status, employee);
    if (minDate && doneDate < minDate) {
        return `Increment done date cannot be before the due date (${formatSalaryIncrementDate(minDate)}).`;
    }

    return null;
};

export const getSalaryIncrementRecordHelperText = (status, mode = "record", employee = null) => {
    const minDate = mode === "edit"
        ? getMinSalaryIncrementEditDate(status, employee)
        : mode === "catchUp"
            ? getMinSalaryIncrementCatchUpDate(status)
            : getMinSalaryIncrementRecordDate(status);
    const today = todayInputValue();

    if (!minDate) {
        return "Choose the date the increment was processed.";
    }

    return `Allowed range: ${formatSalaryIncrementDate(minDate)} to ${formatSalaryIncrementDate(today)}.`;
};

export const getCatchUpOptionLabel = (status) => {
    if (!status?.catchUpTargetYear) {
        return "Catch up through current year";
    }

    const overdueLabel = getOverdueLabel(status.catchUpYearsCount);
    if (overdueLabel) {
        return `Catch up through ${status.catchUpTargetYear} (${overdueLabel})`;
    }

    return `Catch up through ${status.catchUpTargetYear}`;
};

export const getSingleRecordOptionLabel = (status) => {
    if (!status?.nextDueYear) {
        return "Record next increment only";
    }

    return `Record next increment only (${status.nextDueYear})`;
};

export const wasMultiYearCatchUp = (status) => {
    if (status?.lastDueYear == null || status?.priorDueYear == null) {
        return status?.lastDueYear != null && status?.priorDueYear == null;
    }

    return status.lastDueYear - status.priorDueYear > 1;
};

export const getSalaryIncrementStatusLabel = (status) => {
    if (!status?.applicable) {
        return null;
    }

    if (status.message) {
        return status.message;
    }

    return status.statusLabel ?? "—";
};

export const getSalaryIncrementStatusColor = (status) => {
    if (!status?.applicable) {
        return "default";
    }

    if (status.message) {
        return "warning";
    }

    const label = status.statusLabel ?? "";

    if (label.includes("overdue") || label === "Pending" || label === "Due today") {
        return "warning";
    }

    if (label === "Upcoming" || label.startsWith("Next due")) {
        return "info";
    }

    if (label === "Completed for this year") {
        return "success";
    }

    return "default";
};

export const formatIncrementDay = (incrementDate) => formatMonthDayDisplay(incrementDate);

export const getOverdueLabel = (overdueYears) => {
    if (!overdueYears || overdueYears <= 0) {
        return null;
    }

    if (overdueYears === 1) {
        return "1 year overdue";
    }

    return `${overdueYears} years overdue`;
};
