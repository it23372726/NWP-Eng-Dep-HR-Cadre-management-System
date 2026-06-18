export const VEHICLE_PERMIT_INTERVAL_YEARS = 5;

export const isSeniorEmployee = (employee) =>
    employee?.serviceLevel?.levelName?.trim().toLowerCase() === "senior";

export const formatVehiclePermitDate = (date) =>
    date ? new Date(date).toLocaleDateString("en-GB") : "—";

export const todayInputValue = () => new Date().toISOString().slice(0, 10);

export const getMinVehiclePermitCollectionDate = (status) => {
    const { seniorSinceDate, nextCollectableDate } = status ?? {};

    if (seniorSinceDate && nextCollectableDate) {
        return seniorSinceDate > nextCollectableDate
            ? seniorSinceDate
            : nextCollectableDate;
    }

    return nextCollectableDate ?? seniorSinceDate ?? null;
};

export const validateVehiclePermitCollectionDate = (collectedDate, status) => {
    if (!collectedDate) {
        return "Collection date is required.";
    }

    const today = todayInputValue();

    if (collectedDate > today) {
        return "Collection date cannot be in the future.";
    }

    if (status?.seniorSinceDate && collectedDate < status.seniorSinceDate) {
        return `Collection date cannot be before the employee became Senior (${formatVehiclePermitDate(status.seniorSinceDate)}).`;
    }

    if (status?.nextCollectableDate && collectedDate < status.nextCollectableDate) {
        return `Collection date cannot be before the next collectable date (${formatVehiclePermitDate(status.nextCollectableDate)}).`;
    }

    return null;
};

export const getVehiclePermitCollectionHelperText = (status) => {
    const minDate = getMinVehiclePermitCollectionDate(status);
    const today = todayInputValue();

    if (!minDate) {
        return "Choose the date the permit was collected.";
    }

    return `Allowed range: ${formatVehiclePermitDate(minDate)} to ${formatVehiclePermitDate(today)}.`;
};

export const getVehiclePermitStatusLabel = (status) => {
    if (!status?.applicable) {
        return null;
    }

    if (status.message) {
        return status.message;
    }

    if (status.canCollectNow) {
        return "Eligible now";
    }

    if (status.nextCollectableDate) {
        return `Collectable on ${formatVehiclePermitDate(status.nextCollectableDate)}`;
    }

    return "Not yet collectable";
};

export const getVehiclePermitStatusColor = (status) => {
    if (!status?.applicable) {
        return "default";
    }

    if (status.message) {
        return "warning";
    }

    if (status.canCollectNow) {
        return "success";
    }

    return "info";
};
