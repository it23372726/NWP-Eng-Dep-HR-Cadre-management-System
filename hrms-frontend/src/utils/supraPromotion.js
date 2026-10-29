export const isSupraOnlyDesignation = designation =>
    designation?.allowedGrades?.length === 1 && designation.allowedGrades[0] === "Supra";

export const isSupraExamPromotion = (grade, designation) =>
    ["III", "II", "I"].includes(grade) && isSupraOnlyDesignation(designation);

export const resolvePromotionGrade = (actionType, currentGrade, designation, selectedGrade) =>
    actionType === "PROMOTION" && isSupraExamPromotion(currentGrade, designation)
        ? "Supra" : selectedGrade;
