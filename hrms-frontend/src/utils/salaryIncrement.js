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

export const getMinSalaryIncrementEditDate = (status) =>
    status?.lastDueDate ?? null;

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

export const validateSalaryIncrementEditDate = (doneDate, status) => {
    if (!doneDate) {
        return "Increment done date is required.";
    }

    const today = todayInputValue();

    if (doneDate > today) {
        return "Increment done date cannot be in the future.";
    }

    const minDate = getMinSalaryIncrementEditDate(status);
    if (minDate && doneDate < minDate) {
        return `Increment done date cannot be before the due date (${formatSalaryIncrementDate(minDate)}).`;
    }

    return null;
};

export const getSalaryIncrementRecordHelperText = (status, mode = "record") => {
    const minDate = mode === "edit"
        ? getMinSalaryIncrementEditDate(status)
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

export const isLatestCatchUpOperation = (status) =>
    status?.lastOperationType === "CATCH_UP"
    || (Number(status?.lastOperationRecordCount) > 1);

export const formatSalaryIncrementDoneDate = (doneDate, { legacyImported = false } = {}) => {
    if (doneDate) {
        return formatSalaryIncrementDate(doneDate);
    }

    if (legacyImported) {
        return "Completion date unavailable — imported from legacy increment status.";
    }

    return "—";
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

export const CATCH_UP_MIN_OVERDUE_YEARS = 2;

const periodBoundary = (period) =>
    period?.firstIncrementDueDate || period?.startDate || null;

const isPeriodDueEligible = (period, dueDate) => {
    const boundary = periodBoundary(period);
    if (!dueDate || !boundary || dueDate < boundary) {
        return false;
    }
    if (period.endDate && dueDate >= period.endDate) {
        return false;
    }
    return true;
};

const duesOnOrBefore = (period, today) => {
    const boundary = periodBoundary(period);
    if (!boundary || !period?.incrementDate) {
        return [];
    }

    const endYear = Number(String(today).slice(0, 4));
    const dues = [];
    for (let year = Number(String(boundary).slice(0, 4)); year <= endYear; year += 1) {
        const dueDate = resolveDueDate(period.incrementDate, year);
        if (!isPeriodDueEligible(period, dueDate) || dueDate > today) {
            continue;
        }
        dues.push({ year, dueDate });
    }
    return dues;
};

const nextOpenDue = (period, completed, today) => {
    const boundary = periodBoundary(period);
    if (!boundary || !period?.incrementDate) {
        return null;
    }

    const startYear = Number(String(boundary).slice(0, 4));
    const endYear = Math.max(startYear, Number(String(today).slice(0, 4)) + 1);
    for (let year = startYear; year <= endYear; year += 1) {
        const dueDate = resolveDueDate(period.incrementDate, year);
        if (!isPeriodDueEligible(period, dueDate) || completed.has(year)) {
            continue;
        }
        return { year, dueDate };
    }
    return null;
};

const previewStatusLabel = (canRecordNow, overdueYears, nextDue, today) => {
    if (!nextDue) {
        return "Schedule complete";
    }
    if (!canRecordNow) {
        if (nextDue.dueDate.slice(0, 4) > today.slice(0, 4)) {
            return "Completed for this year";
        }
        return "Upcoming";
    }
    if (nextDue.dueDate === today) {
        return "Due today";
    }
    if (overdueYears > 1) {
        return `${overdueYears} years overdue`;
    }
    if (overdueYears === 1) {
        return "1 year overdue";
    }
    return "Pending";
};

export const salaryIncrementPeriodKey = (period) =>
    (period?.current ? "CURRENT" : (period?.key || "INITIAL"));

export const buildSalaryIncrementPeriods = ({
    events = [],
    incrementDate = "",
    appointmentDate = "",
    savedAppointments = []
} = {}) => {
    const savedByKey = new Map(
        (savedAppointments || [])
            .filter((period) => period && !period.superseded)
            .map((period) => [period.appointmentKey, period])
    );
    const periods = [];
    let current = null;

    const openInitial = (startDate) => {
        current = {
            key: null,
            startDate,
            incrementDate: incrementDate || "",
            firstIncrementDueDate: null,
            endDate: null,
            current: true
        };
        periods.push(current);
    };

    events.forEach((event) => {
        if (event?.actionType === "NEW_APPOINTMENT" && !event.trainingAppointment && !event.autoCreated) {
            if (!current) {
                openInitial(event.actionDate);
            } else if (periods[0]) {
                periods[0].startDate = event.actionDate;
            }
        }
        if (event?.actionType === "SERVICE_APPOINTMENT") {
            if (!current) {
                openInitial(event.actionDate);
            }
            current.endDate = event.actionDate;
            current.current = false;
            if (!current.key) {
                current.key = "INITIAL";
            }
            current = {
                key: event.serviceAppointmentKey || null,
                startDate: event.actionDate,
                incrementDate: event.incrementDate || "",
                firstIncrementDueDate: event.firstIncrementDueDate || null,
                endDate: null,
                current: true
            };
            periods.push(current);
        }
    });

    if (!current && appointmentDate) {
        openInitial(appointmentDate);
    }

    periods.forEach((period) => {
        const single = periods.length === 1;
        if (single) {
            const stored = savedByKey.get("INITIAL");
            period.key = null;
            period.current = true;
            period.incrementDate = incrementDate || "";
            period.firstIncrementDueDate = stored?.startDate === period.startDate
                ? (stored.firstIncrementDueDate || null)
                : null;
            return;
        }
        if (period.key === "INITIAL") {
            const stored = savedByKey.get("INITIAL");
            period.incrementDate = stored?.incrementDate || incrementDate || "";
            period.firstIncrementDueDate = stored?.firstIncrementDueDate || null;
        }
    });

    return periods.filter((period) => period.startDate);
};

export const salaryIncrementPeriodLabel = (period, total) => {
    const day = formatIncrementDay(period.incrementDate);
    const when = period.startDate ? formatSalaryIncrementDate(period.startDate) : "—";
    let name;
    if (period.current && total === 1) {
        name = "Current appointment";
    } else if (period.current) {
        name = `Current appointment from ${when}`;
    } else if (period.key === "INITIAL") {
        name = `Original appointment from ${when}`;
    } else {
        name = `Appointment from ${when}`;
    }
    return day && day !== "—" ? `${name} · ${day}` : name;
};

export const completedIncrementYears = (records, period) => {
    const scope = !period?.key || period.key === "INITIAL" ? "INITIAL" : period.key;
    const years = new Set();
    (records || []).forEach((record) => {
        if (record?.status && record.status !== "RECORDED") {
            return;
        }
        const key = record.serviceAppointmentKey || "INITIAL";
        if (key === scope) {
            years.add(record.dueYear);
        }
    });
    return years;
};

export const buildSalaryIncrementPreview = (period, completedYears, today = todayInputValue()) => {
    const completed = completedYears instanceof Set
        ? new Set(completedYears)
        : new Set(completedYears || []);
    if (!period?.startDate || !period?.incrementDate) {
        return {
            applicable: false,
            canRecordNow: false,
            overdueYears: 0,
            statusLabel: null
        };
    }

    const nextDue = nextOpenDue(period, completed, today);
    const throughToday = duesOnOrBefore(period, today);
    const missing = throughToday.filter((item) => !completed.has(item.year));
    const catchUpTarget = throughToday.length
        ? throughToday[throughToday.length - 1]
        : null;
    const canRecordNow = Boolean(nextDue && nextDue.dueDate <= today);
    const canCatchUp = canRecordNow
        && missing.length >= CATCH_UP_MIN_OVERDUE_YEARS
        && Boolean(catchUpTarget);

    return {
        applicable: true,
        canRecordNow,
        nextDueDate: nextDue?.dueDate ?? null,
        nextDueYear: nextDue?.year ?? null,
        overdueYears: missing.length,
        canCatchUpToCurrentYear: canCatchUp,
        catchUpTargetYear: catchUpTarget?.year ?? null,
        catchUpTargetDueDate: catchUpTarget?.dueDate ?? null,
        catchUpYearsCount: canCatchUp ? missing.length : 0,
        incrementDate: period.incrementDate,
        statusLabel: previewStatusLabel(canRecordNow, missing.length, nextDue, today)
    };
};

export const applySalaryIncrementDraft = (period, completedYears, draft, today = todayInputValue()) => {
    const completed = new Set(completedYears);
    const status = buildSalaryIncrementPreview(period, completed, today);
    if (!status.canRecordNow) {
        return { error: "Salary increment is not yet due.", completed, covered: [] };
    }

    if (draft.catchUpToCurrentYear) {
        if (!status.canCatchUpToCurrentYear) {
            return {
                error: "Catch-up is only available when multiple years are overdue.",
                completed,
                covered: []
            };
        }
        const targetYear = draft.catchUpThroughYear ?? status.catchUpTargetYear;
        if (!Number.isInteger(targetYear) || targetYear < status.nextDueYear || targetYear > status.catchUpTargetYear)
            return { error: "Choose a year between the next overdue year and the latest due year.", completed, covered: [] };
        const dateError = validateSalaryIncrementCatchUpDate(draft.doneDate, { ...status, catchUpTargetDueDate: resolveDueDate(period.incrementDate, targetYear) });
        if (dateError) {
            return { error: dateError, completed, covered: [] };
        }
        const covered = duesOnOrBefore(period, today)
            .filter((item) => item.year <= targetYear && !completed.has(item.year));
        covered.forEach((item) => completed.add(item.year));
        return { error: null, completed, covered };
    }

    const dateError = validateSalaryIncrementRecordDate(draft.doneDate, status);
    if (dateError) {
        return { error: dateError, completed, covered: [] };
    }
    completed.add(status.nextDueYear);
    return {
        error: null,
        completed,
        covered: [{ year: status.nextDueYear, dueDate: status.nextDueDate }]
    };
};

export const replaySalaryIncrementDrafts = (
    period,
    savedRecords,
    drafts,
    today = todayInputValue()
) => {
    let completed = completedIncrementYears(savedRecords, period);
    const identity = salaryIncrementPeriodKey(period);
    const lines = [];
    let error = null;

    (savedRecords || [])
        .filter((record) => !record?.status || record.status === "RECORDED")
        .filter((record) => {
            const key = record.serviceAppointmentKey || "INITIAL";
            const scope = !period?.key || period.key === "INITIAL" ? "INITIAL" : period.key;
            return key === scope;
        })
        .sort((left, right) => left.dueYear - right.dueYear)
        .forEach((record) => {
            lines.push({
                kind: "saved",
                label: `${record.dueYear} · due ${formatSalaryIncrementDate(record.dueDate)} · done ${formatSalaryIncrementDate(record.doneDate)}`
            });
        });

    (drafts || []).forEach((draft) => {
        if (draft.periodKey !== identity || error) {
            return;
        }
        const applied = applySalaryIncrementDraft(period, completed, draft, today);
        if (applied.error) {
            error = applied.error;
            return;
        }
        completed = applied.completed;
        const years = applied.covered.map((item) => item.year);
        const span = years.length > 1
            ? `${years[0]}–${years[years.length - 1]}`
            : String(years[0]);
        lines.push({
            kind: "queued",
            label: `${draft.catchUpToCurrentYear ? "Catch up" : "Record"} ${span} on ${formatSalaryIncrementDate(draft.doneDate)}`
        });
    });

    return {
        error,
        lines,
        status: buildSalaryIncrementPreview(period, completed, today)
    };
};

export const getOverdueLabel = (overdueYears) => {
    if (!overdueYears || overdueYears <= 0) {
        return null;
    }

    if (overdueYears === 1) {
        return "1 year overdue";
    }

    return `${overdueYears} years overdue`;
};
