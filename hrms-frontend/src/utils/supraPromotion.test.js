import test from "node:test";
import assert from "node:assert/strict";
import { isSupraOnlyDesignation, isSupraExamPromotion, resolvePromotionGrade } from "./supraPromotion.js";
import { getCareerHistoryEventMinDate } from "./gradeAchievementDates.js";
const ao={allowedGrades:["Supra"],service:{supraRequiredYears:99}};
for(const grade of ["III","II","I"]) {
    test(`${grade} can enter a Supra-only designation without Grade I tenure`,()=>{
        assert.equal(isSupraExamPromotion(grade,ao),true);
        assert.equal(getCareerHistoryEventMinDate({actionType:"PROMOTION",grade:"Supra",timelineState:{grade,grade1AchievedDate:"2020-01-01"},designation:ao}),null);
    });
}
test("Special and ordinary designations do not use the exam-only route",()=>{
    assert.equal(isSupraOnlyDesignation({allowedGrades:["Special"]}),false);
    assert.equal(isSupraExamPromotion("II",{allowedGrades:["III","II","I"]}),false);
    assert.equal(isSupraExamPromotion("Supra",ao),false);
    assert.equal(isSupraOnlyDesignation({allowedGrades:["I","Supra"]}),false);
});
test("Special promotion retains Grade I service requirement",()=>{
    assert.equal(getCareerHistoryEventMinDate({actionType:"PROMOTION",grade:"Special",timelineState:{grade:"I",grade1AchievedDate:"2020-01-01"},designation:{service:{specialRequiredYears:5}}}),"2025-01-01");
});
test("Supra exam exception does not apply to assignment grade updates",()=>{
    assert.equal(getCareerHistoryEventMinDate({actionType:"ASSIGNMENT_GRADE_UPDATE",grade:"Supra",timelineState:{grade:"I",grade1AchievedDate:"2020-01-01"},designation:ao}),"2119-01-01");
});

for (const currentGrade of ["III", "II", "I"]) {
    test(`selecting AO after choosing Promotion fills the missing grade from ${currentGrade}`, () => {
        const draft = { actionType: "PROMOTION", grade: "", designationId: "AO" };
        const grade = resolvePromotionGrade(draft.actionType, currentGrade, ao, draft.grade);
        assert.equal(grade, "Supra");
        assert.equal(Boolean(grade), true, "Add event must receive a grade without the hidden picker");
        assert.equal(resolvePromotionGrade(draft.actionType, currentGrade, ao, currentGrade), "Supra");
    });
}
test("normal promotions and other events retain their explicitly selected grade", () => {
    assert.equal(resolvePromotionGrade("PROMOTION", "III", {allowedGrades:["III","II","I"]}, "II"), "II");
    assert.equal(resolvePromotionGrade("ASSIGNMENT_GRADE_UPDATE", "III", ao, ""), "");
    assert.equal(resolvePromotionGrade("PROMOTION", "I", {allowedGrades:["Special"]}, "Special"), "Special");
});
