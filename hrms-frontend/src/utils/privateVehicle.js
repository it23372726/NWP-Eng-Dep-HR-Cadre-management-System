export const PRIVATE_VEHICLE_NEAR_EXPIRE_DAYS = 30;

export const PRIVATE_VEHICLE_FILTER_OPTIONS = [
    { value: "", label: "All" },
    { value: "HAS_PRIVATE_VEHICLE", label: "Uses private vehicle" },
    { value: "EXPIRED", label: "Expired" },
    { value: "NEAR_EXPIRE", label: "Near expiry (1 month)" },
    { value: "RENTED", label: "Rented vehicle" }
];

function parseDateOnly(value) {
    if (!value) {
        return null;
    }

    const [year, month, day] = value.split("-").map(Number);
    if (!year || !month || !day) {
        return null;
    }

    return new Date(year, month - 1, day);
}

function startOfToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
}

export function usesPrivateVehicleForGovWork(employee) {
    return employee?.privateVehicleUsedForGovWork === true;
}

export function getPrivateVehicleExpireStatus(employee) {
    if (!usesPrivateVehicleForGovWork(employee)) {
        return null;
    }

    const expireDate = parseDateOnly(employee.privateVehicleExpireDate);
    if (!expireDate) {
        return { kind: "UNKNOWN", expireDate: null };
    }

    expireDate.setHours(0, 0, 0, 0);
    const today = startOfToday();

    if (expireDate < today) {
        return { kind: "EXPIRED", expireDate };
    }

    const nearLimit = new Date(today);
    nearLimit.setDate(nearLimit.getDate() + PRIVATE_VEHICLE_NEAR_EXPIRE_DAYS);

    if (expireDate <= nearLimit) {
        return { kind: "NEAR_EXPIRE", expireDate };
    }

    return { kind: "VALID", expireDate };
}

export function getPrivateVehicleExpireStatusLabel(status) {
    switch (status?.kind) {
    case "EXPIRED":
        return "Expired";
    case "NEAR_EXPIRE":
        return "Expiring within 1 month";
    case "VALID":
        return "Valid";
    default:
        return "Expire date missing";
    }
}

export function getPrivateVehicleExpireStatusColor(status) {
    switch (status?.kind) {
    case "EXPIRED":
        return "error";
    case "NEAR_EXPIRE":
        return "warning";
    case "VALID":
        return "success";
    default:
        return "default";
    }
}

export function matchesPrivateVehicleFilter(employee, filterValue) {
    if (!filterValue) {
        return true;
    }

    if (filterValue === "HAS_PRIVATE_VEHICLE") {
        return usesPrivateVehicleForGovWork(employee);
    }

    if (filterValue === "RENTED") {
        return usesPrivateVehicleForGovWork(employee)
            && employee?.privateVehicleRented === true;
    }

    const status = getPrivateVehicleExpireStatus(employee);
    if (filterValue === "EXPIRED") {
        return status?.kind === "EXPIRED";
    }

    if (filterValue === "NEAR_EXPIRE") {
        return status?.kind === "NEAR_EXPIRE";
    }

    return true;
}

export function findPrivateVehicleFilterLabel(filterValue) {
    const match = PRIVATE_VEHICLE_FILTER_OPTIONS.find(
        (option) => option.value === filterValue
    );
    return match?.label ?? filterValue;
}
