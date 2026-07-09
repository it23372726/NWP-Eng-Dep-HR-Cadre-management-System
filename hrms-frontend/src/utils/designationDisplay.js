import { isOtherDesignation } from "../constants/hrms";
import { sortGradesForDisplay } from "./reportSortOrder";

const formatGradeForLabel = (grade) => (grade === "Special" ? "Spl" : grade);

export const formatDesignationOptionLabel = (
    designation,
    { suffix = "" } = {}
) => {
    if (!designation) {
        return "";
    }

    const name = `${designation.designationName || ""}${suffix}`;
    const grades = sortGradesForDisplay(designation.allowedGrades);

    if (!grades.length) {
        return name;
    }

    const gradePart = grades.map(formatGradeForLabel).join("/");
    return `${name} · ${gradePart}`;
};

export const renderDesignationSelectValue = (
    value,
    designations = [],
    { suffixFn } = {}
) => {
    if (isOtherDesignation(value)) {
        return "Other (type historical title)";
    }

    const designation = designations.find(
        (item) => item.id === Number(value)
    );

    if (!designation) {
        return "";
    }

    const suffix = suffixFn?.(designation) ?? "";
    return formatDesignationOptionLabel(designation, { suffix });
};
