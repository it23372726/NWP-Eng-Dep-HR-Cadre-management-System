import { matchesRetiringWithin } from "./employeeListFilters";
import { isPermanentEmployee } from "../constants/hrms";
import { getDistricts, normalizeDistrictLabel } from "./organizationSettingsStore";

export function computeActiveEmployeeStats(employees = []) {
    const list = Array.isArray(employees) ? employees : [];
    const permanentEmployees = list.filter((employee) =>
        isPermanentEmployee(employee?.employmentType)
    );
    const districts = getDistricts();
    const districtCounts = Object.fromEntries(
        districts.map((district) => [district, 0])
    );

    let probation = 0;
    let qualifiedForPermanent = 0;
    let confirmedPermanent = 0;
    let gradePromotionReady = 0;
    let nearRetirement = 0;

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

        const district = normalizeDistrictLabel(employee?.currentDistrictOfWorking);
        if (district && Object.prototype.hasOwnProperty.call(districtCounts, district)) {
            districtCounts[district] += 1;
        }
    });

    return {
        total: list.length,
        probation,
        qualifiedForPermanent,
        confirmedPermanent,
        gradePromotionReady,
        nearRetirement,
        districtCounts,
        // Backward-compatible aliases for default districts
        kurunegala: districtCounts.Kurunegala ?? 0,
        puttalam: districtCounts.Puttalam ?? 0
    };
}
