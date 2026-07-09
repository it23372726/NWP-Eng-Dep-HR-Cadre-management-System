const SERVICE_LEVEL_ORDER = ["Senior", "Tertiary", "Secondary", "Primary"];

const GRADE_ORDER = ["Supra", "Special", "I", "II", "III", "None"];

export const serviceLevelRank = (levelName) => {
    if (!levelName?.trim()) {
        return Number.MAX_SAFE_INTEGER;
    }

    const normalized = levelName.trim().toLowerCase();
    const index = SERVICE_LEVEL_ORDER.findIndex(
        (level) => level.toLowerCase() === normalized
    );

    return index >= 0 ? index : Number.MAX_SAFE_INTEGER;
};

export const gradeRank = (grade) => {
    if (!grade?.trim()) {
        return Number.MAX_SAFE_INTEGER;
    }

    const normalized = grade.trim().toLowerCase();
    const index = GRADE_ORDER.findIndex(
        (value) => value.toLowerCase() === normalized
    );

    return index >= 0 ? index : Number.MAX_SAFE_INTEGER;
};

export const sortGradesForDisplay = (grades = []) => {
    if (!Array.isArray(grades) || grades.length === 0) {
        return [];
    }

    return [...grades].sort((left, right) => gradeRank(left) - gradeRank(right));
};

export const bestAllowedGradeRank = (allowedGrades = []) => {
    if (!Array.isArray(allowedGrades) || allowedGrades.length === 0) {
        return Number.MAX_SAFE_INTEGER;
    }

    return Math.min(...allowedGrades.map((grade) => gradeRank(grade)));
};

export const compareDesignationsForReport = (left, right) => {
    const byServiceLevel = serviceLevelRank(left?.serviceLevel?.levelName)
        - serviceLevelRank(right?.serviceLevel?.levelName);
    if (byServiceLevel !== 0) {
        return byServiceLevel;
    }

    const byGrade = bestAllowedGradeRank(left?.allowedGrades)
        - bestAllowedGradeRank(right?.allowedGrades);
    if (byGrade !== 0) {
        return byGrade;
    }

    return (left?.designationName || "").localeCompare(
        right?.designationName || "",
        undefined,
        { sensitivity: "base" }
    );
};

export const sortDesignationsForReport = (designations = []) =>
    [...designations].sort(compareDesignationsForReport);

export const compareCadresForDisplay = (left, right) =>
    compareDesignationsForReport(left?.designation, right?.designation);

export const sortCadresForDisplay = (cadres = []) =>
    [...cadres].sort(compareCadresForDisplay);
