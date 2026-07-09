export const DEFAULT_DISTRICTS = ["Kurunegala", "Puttalam"];
export const DEFAULT_PRIMARY_DEPARTMENT = "N.W.P. Engineering Department";

export const DEFAULT_ORGANIZATION_SETTINGS = {
    primaryDepartmentName: DEFAULT_PRIMARY_DEPARTMENT,
    provincialCouncilName: "North Western Provincial Council",
    departmentShortName: "NWP Engineering",
    applicationName: "NWP HRMS",
    councilLabel: "N.W.P. Council",
    districts: [...DEFAULT_DISTRICTS],
    reportHeaderSubtitle:
        "North Western Provincial Council — NWP Engineering",
    reportHeaderUppercase:
        "NORTH WESTERN PROVINCIAL ENGINEERING DEPARTMENT",
    updatedAt: null
};

let cachedSettings = { ...DEFAULT_ORGANIZATION_SETTINGS };

export function setOrganizationSettingsCache(settings) {
    if (!settings) {
        return cachedSettings;
    }

    cachedSettings = {
        ...DEFAULT_ORGANIZATION_SETTINGS,
        ...settings,
        districts: Array.isArray(settings.districts) && settings.districts.length > 0
            ? [...settings.districts]
            : [...DEFAULT_DISTRICTS]
    };
    return cachedSettings;
}

export function getOrganizationSettings() {
    return cachedSettings;
}

export function getPrimaryDepartmentName() {
    return cachedSettings.primaryDepartmentName || DEFAULT_PRIMARY_DEPARTMENT;
}

export function isPrimaryDepartment(department) {
    if (!department) {
        return false;
    }
    const normalized = department.trim().toLowerCase();
    return normalized === getPrimaryDepartmentName().trim().toLowerCase()
        || normalized === DEFAULT_PRIMARY_DEPARTMENT.trim().toLowerCase();
}

export function getDistricts() {
    return cachedSettings.districts?.length
        ? cachedSettings.districts
        : [...DEFAULT_DISTRICTS];
}

export function getDistrictFilterOptions() {
    return [
        { value: "", label: "All districts" },
        ...getDistricts().map((district) => ({
            value: district,
            label: district
        }))
    ];
}

export function normalizeDistrictLabel(value, districts = getDistricts()) {
    if (value === null || value === undefined) {
        return "";
    }

    const text = String(value?.label ?? value).trim();
    if (!text) {
        return "";
    }

    const match = districts.find(
        (district) => district.toLowerCase() === text.toLowerCase()
    );
    if (match) {
        return match;
    }

    const upper = text.toUpperCase().replace(/\s+/g, "_");
    const codeMatch = districts.find(
        (district) => district.toUpperCase().replace(/\s+/g, "_") === upper
    );
    return codeMatch || text;
}

export function toApiDistrict(value, districts = getDistricts()) {
    const label = normalizeDistrictLabel(value, districts);
    return label || null;
}

export function getReportHeaderSubtitle() {
    return cachedSettings.reportHeaderSubtitle
        || `${cachedSettings.provincialCouncilName} — ${cachedSettings.departmentShortName}`;
}

export function getReportHeaderUppercase() {
    return cachedSettings.reportHeaderUppercase
        || `${cachedSettings.provincialCouncilName} ${cachedSettings.primaryDepartmentName}`
            .toUpperCase();
}

export function getApplicationName() {
    return cachedSettings.applicationName || "HRMS";
}

export function getCouncilLabel() {
    return cachedSettings.councilLabel || "Council";
}

export function getDepartmentShortName() {
    return cachedSettings.departmentShortName || "Department";
}
