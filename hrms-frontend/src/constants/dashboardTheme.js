export const SERVICE_COLORS = {
    SLEGS: "#1E40AF",
    SLACS: "#0D9488",
    SLTS: "#059669",
    PPMAS: "#D97706",
    SLAS: "#7C3AED",
    SLEAS: "#0369A1",
    SLIES: "#BE185D",
    DEPT: "#64748B",
    CONTRACT: "#94A3B8",
    CASUAL: "#CBD5E1"
};

export const SERVICE_COLOR_PALETTE = [
    "#1E40AF",
    "#0D9488",
    "#059669",
    "#D97706",
    "#7C3AED",
    "#0369A1",
    "#BE185D",
    "#B45309",
    "#1B7A46",
    "#4F46E5"
];

export const SERVICE_LEVEL_COLORS = {
    Primary: "#2563EB",
    Secondary: "#059669",
    Senior: "#D97706",
    Tertiary: "#7C3AED"
};

export const PERMANENT_STATUS_COLORS = {
    Probation: "#F59E0B",
    "Qualified for Permanent": "#3B82F6",
    "Confirmed Permanent": "#1B7A46"
};

export const GRADE_COLORS = [
    "#93C5FD",
    "#60A5FA",
    "#3B82F6",
    "#1D4ED8",
    "#1E3A8A"
];

export const DISTRICT_COLORS = {
    Kurunegala: "#1E40AF",
    Puttalam: "#0F766E"
};

export const KPI_COLORS = {
    active: "#1B7A46",
    vacancy: "#B45309",
    retirement: "#7C3AED",
    permanent: "#3B82F6",
    grade3to2: "#0891B2",
    grade2to1: "#0F766E"
};

export const CHART_HEIGHT = 320;

export const BAR_CHART_PREVIEW_HEIGHT = 280;
export const BAR_CHART_PREVIEW_ROW_HEIGHT = 24;
export const BAR_CHART_FULL_ROW_HEIGHT = 30;

export const BAR_CHART_PRESETS = {
    workplace: {
        previewBarSize: 20,
        fullBarSize: 24,
        previewRowHeight: 24,
        fullRowHeight: 30,
        previewCategoryGap: "8%",
        fullCategoryGap: "6%",
        previewLabelMaxLength: 18,
        itemLabel: "office"
    },
    designation: {
        previewBarSize: 22,
        fullBarSize: 26,
        previewRowHeight: 22,
        fullRowHeight: 28,
        previewCategoryGap: "4%",
        fullCategoryGap: "3%",
        previewLabelMaxLength: 20,
        itemLabel: "designation"
    }
};

export function normalizeServiceKey(category) {
    return category?.trim().toUpperCase() || "";
}

export function getServiceColor(serviceCode, index = 0) {
    const key = normalizeServiceKey(serviceCode);

    if (SERVICE_COLORS[key]) {
        return SERVICE_COLORS[key];
    }

    const matchedKey = Object.keys(SERVICE_COLORS).find(
        (code) => key.includes(code) || code.includes(key)
    );
    if (matchedKey) {
        return SERVICE_COLORS[matchedKey];
    }

    return SERVICE_COLOR_PALETTE[index % SERVICE_COLOR_PALETTE.length];
}

export function getServiceLevelColor(level) {
    return SERVICE_LEVEL_COLORS[level] || "#0F2A4A";
}

export function getPermanentStatusColor(status) {
    return PERMANENT_STATUS_COLORS[status] || "#64748B";
}

export function getDistrictColor(district) {
    return DISTRICT_COLORS[district] || "#0F2A4A";
}

export function getGradeColor(index) {
    return GRADE_COLORS[index % GRADE_COLORS.length];
}

export function getChartColor(index, palette = GRADE_COLORS) {
    return palette[index % palette.length];
}
