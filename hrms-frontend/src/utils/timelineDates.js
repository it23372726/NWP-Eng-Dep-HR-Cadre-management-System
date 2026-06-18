const formatTimelineDate = (date) =>
    date ? new Date(`${date}T00:00:00`).toLocaleDateString("en-GB") : "—";

export const maxIsoDate = (left, right) => {
    if (!left) {
        return right ?? null;
    }
    if (!right) {
        return left;
    }
    return left >= right ? left : right;
};

export const combineMinDates = (...dates) =>
    dates.reduce((latest, date) => maxIsoDate(latest, date), null);

const compareTimelineEvents = (left, right) => {
    const dateCompare = (left.actionDate || "").localeCompare(right.actionDate || "");
    if (dateCompare !== 0) {
        return dateCompare;
    }

    return (left.id ?? 0) - (right.id ?? 0);
};

const filterTimelineEvents = (events, { excludeAutoCreated = true } = {}) =>
    (events ?? []).filter((event) => {
        if (!event?.actionDate) {
            return false;
        }
        if (excludeAutoCreated && event.autoCreated) {
            return false;
        }
        return true;
    });

export const getLatestEventDate = (events, { excludeAutoCreated = true } = {}) => {
    const sorted = [...filterTimelineEvents(events, { excludeAutoCreated })]
        .sort(compareTimelineEvents);

    if (!sorted.length) {
        return null;
    }

    return sorted[sorted.length - 1].actionDate;
};

export const getPreviousEventDateForEdit = (events, actionId) => {
    if (!actionId) {
        return null;
    }

    const sorted = [...filterTimelineEvents(events, { excludeAutoCreated: false })]
        .sort(compareTimelineEvents);
    const index = sorted.findIndex((event) => event.id === actionId);

    if (index <= 0) {
        return null;
    }

    for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
        const candidate = sorted[cursor];
        if (!candidate.autoCreated) {
            return candidate.actionDate;
        }
    }

    return sorted[index - 1]?.actionDate ?? null;
};

export const validateTimelineDate = (actionDate, previousDate) => {
    if (!actionDate || !previousDate || actionDate >= previousDate) {
        return null;
    }

    return `Event date cannot be before the previous event (${formatTimelineDate(previousDate)}).`;
};

export const timelineMinDateHelperText = (
    minDate,
    { tooEarly = false, contextLabel = "previous event" } = {}
) => {
    if (!minDate) {
        return undefined;
    }

    if (tooEarly) {
        return `Effective date cannot be earlier than ${formatTimelineDate(minDate)} (must be on or after the ${contextLabel}).`;
    }

    return `Earliest allowed: ${formatTimelineDate(minDate)} (on or after the ${contextLabel}).`;
};

export const validateCareerHistoryChronology = (events) => {
    if (!events?.length) {
        return null;
    }

    let previousDate = null;

    for (let index = 0; index < events.length; index += 1) {
        const event = events[index];

        if (event.actionType === "TRANSFER_IN" && event.autoCreated) {
            continue;
        }

        if (!event.actionDate) {
            continue;
        }

        const chronologyError = validateTimelineDate(event.actionDate, previousDate);
        if (chronologyError) {
            return `Event #${index + 1}: ${chronologyError}`;
        }

        previousDate = event.actionDate;
    }

    return null;
};
