import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

export const REFERENCE_YEAR = 2000;

const MONTH_ABBREVS = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const LEGACY_MONTH_MAP = Object.fromEntries(
    MONTH_ABBREVS.map((abbrev, index) => [abbrev.toLowerCase(), index + 1])
);

const pad2 = (value) => String(value).padStart(2, "0");

const isValidMonthDay = (month, day) => {
    if (month < 1 || month > 12 || day < 1) {
        return false;
    }

    const date = dayjs(`${REFERENCE_YEAR}-${pad2(month)}-${pad2(day)}`, "YYYY-MM-DD", true);
    return date.isValid()
        && date.month() + 1 === month
        && date.date() === day;
};

export const toMonthDayValue = (date) => {
    if (!date || !dayjs.isDayjs(date) || !date.isValid()) {
        return "";
    }

    return `${pad2(date.month() + 1)}-${pad2(date.date())}`;
};

export const fromMonthDayValue = (value) => {
    const normalized = parseLegacyMonthDay(value);
    if (!normalized) {
        return null;
    }

    const [month, day] = normalized.split("-").map(Number);
    if (!isValidMonthDay(month, day)) {
        return null;
    }

    return dayjs(`${REFERENCE_YEAR}-${normalized}`, "YYYY-MM-DD", true);
};

export const formatMonthDayDisplay = (value) => {
    const normalized = parseLegacyMonthDay(value);
    if (!normalized) {
        return "—";
    }

    const [month, day] = normalized.split("-").map(Number);
    if (!isValidMonthDay(month, day)) {
        return value || "—";
    }

    return `${pad2(day)} ${MONTH_ABBREVS[month - 1]}`;
};

export const parseLegacyMonthDay = (value) => {
    if (!value || typeof value !== "string") {
        return "";
    }

    const trimmed = value.trim();
    if (!trimmed) {
        return "";
    }

    const canonicalMatch = trimmed.match(/^(\d{2})-(\d{2})$/);
    if (canonicalMatch) {
        const month = Number(canonicalMatch[1]);
        const day = Number(canonicalMatch[2]);
        return isValidMonthDay(month, day) ? trimmed : "";
    }

    const legacyMatch = trimmed.match(/^(\d{1,2})[-\s]([A-Za-z]{3})$/);
    if (legacyMatch) {
        const day = Number(legacyMatch[1]);
        const month = LEGACY_MONTH_MAP[legacyMatch[2].toLowerCase()];
        if (month && isValidMonthDay(month, day)) {
            return `${pad2(month)}-${pad2(day)}`;
        }
    }

    return "";
};
