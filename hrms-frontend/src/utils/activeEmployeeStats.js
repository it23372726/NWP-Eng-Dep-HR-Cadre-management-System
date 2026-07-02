import { matchesRetiringWithin } from "./employeeListFilters";
import { isPermanentEmployee } from "../constants/hrms";

export function computeActiveEmployeeStats(employees = []) {
    const list = Array.isArray(employees) ? employees : [];
    const permanentEmployees = list.filter((employee) =>
        isPermanentEmployee(employee?.employmentType)
    );

    let probation = 0;
    let qualifiedForPermanent = 0;
    let confirmedPermanent = 0;
    let gradePromotionReady = 0;
    let nearRetirement = 0;
    let kurunegala = 0;
    let puttalam = 0;

    permanentEmployees.forEach((employee) => {
        const status = employee?.permanentStatus;

        if (status === "PROBATION") {
            probation += 1;
        } else if (status === "QUALIFIED_FOR_PERMANENT") {
            qualifiedForPermanent += 1;
        } else if (status === "PERMANENT") {
            confirmedPermanent += 1;
        }

        const career = employee?.careerProgression;
        if (
            (employee?.grade === "III" && career?.qualifiedForGrade2)
            || (employee?.grade === "II" && career?.qualifiedForGrade1)
            || (employee?.grade === "I" && career?.qualifiedForSupra)
            || (employee?.grade === "I" && career?.qualifiedForSpecial)
        ) {
            gradePromotionReady += 1;
        }
    });

    list.forEach((employee) => {
        if (matchesRetiringWithin(employee, 24)) {
            nearRetirement += 1;
        }

        const district = String(employee?.currentDistrictOfWorking || "").toLowerCase();
        if (district === "kurunegala") {
            kurunegala += 1;
        } else if (district === "puttalam") {
            puttalam += 1;
        }
    });

    return {
        total: list.length,
        probation,
        qualifiedForPermanent,
        confirmedPermanent,
        gradePromotionReady,
        nearRetirement,
        kurunegala,
        puttalam
    };
}
