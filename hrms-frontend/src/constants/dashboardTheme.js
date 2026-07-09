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
    "#4F46E5",
    "#DC2626",
    "#EA580C",
    "#CA8A04",
    "#65A30D",
    "#0891B2",
    "#2DD4BF",
    "#8B5CF6",
    "#DB2777",
    "#E11D48",
    "#F97316",
    "#14B8A6",
    "#6366F1",
    "#A855F7",
    "#EC4899",
    "#F43F5E",
    "#0E7490",
    "#15803D",
    "#A16207",
    "#9F1239",
    "#5B21B6"
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
    "Confirmed Permanent": "#1B7A46",
    Acting: "#7C3AED",
    Contract: "#475569",
    Casual: "#94A3B8",
    Substitute: "#0D9488"
};

export const GRADE_COLORS = [
    "#93C5FD",
    "#60A5FA",
    "#3B82F6",
    "#1D4ED8",
    "#1E3A8A"
];

export const GRADE_NAMED_COLORS = {
    "Grade Supra": "#1E3A8A",
    "Grade Special": "#1D4ED8",
    "Grade I": "#3B82F6",
    "Grade II": "#60A5FA",
    "Grade III": "#93C5FD",
    "Grade None": "#94A3B8"
};

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
    grade2to1: "#0F766E",
    gradeSupra: "#1E3A8A",
    gradeSpecial: "#1D4ED8"
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

    return SERVICE_COLOR_PALETTE[index % SERVICE_COLOR_PALETTE.length];
}

export function buildChartColorMap(categories = [], knownColors = {}) {
    const colorMap = new Map();
    const usedColors = new Set();

    const assignColor = (category, color) => {
        if (!color || usedColors.has(color)) {
            return false;
        }

        usedColors.add(color);
        colorMap.set(category, color);
        return true;
    };

    for (const category of categories) {
        assignColor(category, knownColors[category]);
    }

    let paletteIndex = 0;
    for (const category of categories) {
        if (colorMap.has(category)) {
            continue;
        }

        while (paletteIndex < SERVICE_COLOR_PALETTE.length) {
            const paletteColor = SERVICE_COLOR_PALETTE[paletteIndex];
            paletteIndex += 1;

            if (assignColor(category, paletteColor)) {
                break;
            }
        }

        if (!colorMap.has(category)) {
            const index = categories.indexOf(category);
            const hue = Math.round((index * 137.508) % 360);
            assignColor(category, `hsl(${hue}, 62%, 42%)`);
        }
    }

    return colorMap;
}

export function buildServiceChartColorMap(categories = []) {
    const knownColors = Object.fromEntries(
        categories
            .map((category) => {
                const key = normalizeServiceKey(category);
                return SERVICE_COLORS[key] ? [category, SERVICE_COLORS[key]] : null;
            })
            .filter(Boolean)
    );

    return buildChartColorMap(categories, knownColors);
}

export function getServiceLevelColor(level) {
    return SERVICE_LEVEL_COLORS[level] || "#0F2A4A";
}

export function getPermanentStatusColor(status) {
    return PERMANENT_STATUS_COLORS[status] || "#64748B";
}

export function getDistrictColor(district, index = 0) {
    if (!district) {
        return "#0F2A4A";
    }

    if (DISTRICT_COLORS[district]) {
        return DISTRICT_COLORS[district];
    }

    const known = Object.keys(DISTRICT_COLORS).find(
        (key) => key.toLowerCase() === String(district).toLowerCase()
    );
    if (known) {
        return DISTRICT_COLORS[known];
    }

    const text = String(district);
    let hash = 0;
    for (let i = 0; i < text.length; i += 1) {
        hash = ((hash << 5) - hash) + text.charCodeAt(i);
        hash |= 0;
    }
    const paletteIndex = Math.abs(hash + index) % SERVICE_COLOR_PALETTE.length;
    return SERVICE_COLOR_PALETTE[paletteIndex];
}

export function getGradeColor(index) {
    return GRADE_COLORS[index % GRADE_COLORS.length];
}

export function getChartColor(index, palette = GRADE_COLORS) {
    return palette[index % palette.length];
}
