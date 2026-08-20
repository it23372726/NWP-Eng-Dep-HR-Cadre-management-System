import { calculateRetirementDate } from "./employeeRetirement";
import { hasCompletedProbationYears } from "./gradeAchievementDates";
import { matchesIncrementStatus } from "./salaryIncrement";
import { matchesPrivateVehicleFilter, findPrivateVehicleFilterLabel } from "./privateVehicle";
import {
    EMPLOYEE_TYPE_FILTER_OPTIONS,
    getEmploymentTypeLabel,
    isTrainingEmployee,
    resolveEmployeeDesignationName,
    resolveEmployeeService,
    NON_PERMANENT_EMPLOYMENT_FILTER_VALUES,
    PERMANENT_TRACK_FILTER_VALUES,
    GRADE_PROMOTION_FILTER_OPTIONS,
    RETIREMENT_FILTER_OPTIONS,
    QUALIFICATION_FILTER_OPTIONS,
    GRADES
} from "../constants/hrms";

export const INCREMENT_STATUS_FILTER_OPTIONS = [
    { value: "", label: "All" },
    { value: "PENDING", label: "Pending salary increments" },
    { value: "UPCOMING", label: "Upcoming salary increments" }
];

const GRADE_FILTER_ORDER = GRADES.filter((grade) => grade !== "None");

const PERMANENT_REQUIREMENT_TYPES = ["CUSTOM_PERMANENT_REQUIREMENT"];
const GRADE2_REQUIREMENT_TYPES = ["CUSTOM_GRADE_2_REQUIREMENT"];
const GRADE1_REQUIREMENT_TYPES = ["CUSTOM_GRADE_1_REQUIREMENT"];
const CUSTOM_PERMANENT_TYPE = "CUSTOM_PERMANENT_REQUIREMENT";

function requiresProbationPeriodGate(filterValue) {
    if (filterValue === "PENDING_PERMANENT"
        || filterValue === CUSTOM_PERMANENT_TYPE) {
        return true;
    }

    return PERMANENT_REQUIREMENT_TYPES.includes(filterValue);
}

export function isQualifiedForGradePromotion(employee, filterValue) {
    const career = employee?.careerProgression;

    if (filterValue === "QUALIFIED_GRADE_3_TO_2") {
        return employee?.grade === "III"
            && Boolean(career?.qualifiedForGrade2);
    }

    if (filterValue === "QUALIFIED_GRADE_2_TO_1") {
        return employee?.grade === "II"
            && Boolean(career?.qualifiedForGrade1);
    }

    if (filterValue === "QUALIFIED_GRADE_1_TO_SUPRA") {
        return employee?.grade === "I"
            && Boolean(career?.qualifiedForSupra);
    }

    if (filterValue === "QUALIFIED_GRADE_1_TO_SPECIAL") {
        return employee?.grade === "I"
            && Boolean(career?.qualifiedForSpecial);
    }

    return true;
}

export function matchesRetiringWithin(employee, months) {
    if (!months) {
        return true;
    }

    const parsedMonths = Number(months);
    if (!Number.isFinite(parsedMonths) || parsedMonths < 0) {
        return true;
    }

    const retirementDate = calculateRetirementDate(employee?.dateOfBirth);
    if (!retirementDate) {
        return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const monthsRemaining = (
        (retirementDate.getFullYear() - today.getFullYear()) * 12
        + (retirementDate.getMonth() - today.getMonth())
    );

    return monthsRemaining >= 0 && monthsRemaining <= parsedMonths;
}

export function matchesDistrictFilter(employee, district) {
    if (!district) {
        return true;
    }

    const employeeDistrict = employee?.currentDistrictOfWorking;
    if (!employeeDistrict) {
        return false;
    }

    return String(employeeDistrict).toLowerCase() === district.toLowerCase();
}

export function resolveEmployeeOffice(employee) {
    const office = employee?.currentOffice?.trim();
    if (office) {
        return office;
    }

    const workingPlace = employee?.currentWorkingPlace?.trim();
    if (!workingPlace) {
        return null;
    }

    const separator = workingPlace.indexOf(" — ");
    if (separator >= 0) {
        const parsedOffice = workingPlace.substring(separator + 3).trim();
        if (parsedOffice) {
            return parsedOffice;
        }
    }

    return workingPlace;
}

export function matchesOfficeFilter(employee, office) {
    if (!office) {
        return true;
    }

    const employeeOffice = resolveEmployeeOffice(employee);
    if (!employeeOffice) {
        return false;
    }

    return employeeOffice.toLowerCase() === office.toLowerCase();
}

function equalsIgnoreCase(left, right) {
    if (!left || !right) {
        return false;
    }
    return String(left).toLowerCase() === String(right).toLowerCase();
}

export function resolveEmployeeServiceLabel(employee) {
    const service = resolveEmployeeService(employee);
    if (!service) {
        return null;
    }
    const code = service.serviceCode?.trim();
    if (code) {
        return code;
    }
    return service.description?.trim() || null;
}

export function matchesDesignationFilter(employee, designation) {
    if (!designation) {
        return true;
    }
    const name = resolveEmployeeDesignationName(employee);
    return equalsIgnoreCase(name, designation);
}

export function matchesServiceFilter(employee, service) {
    if (!service) {
        return true;
    }
    return equalsIgnoreCase(resolveEmployeeServiceLabel(employee), service);
}

export function matchesServiceLevelFilter(employee, serviceLevel) {
    if (!serviceLevel) {
        return true;
    }
    return equalsIgnoreCase(employee?.serviceLevel?.levelName, serviceLevel);
}

export function matchesGradeFilter(employee, grade) {
    if (!grade) {
        return true;
    }

    const employeeGrade = employee?.grade;
    if (!employeeGrade || employeeGrade === "None" || employeeGrade === "NONE") {
        return false;
    }

    const normalized = String(employeeGrade).replace(/^Grade\s+/i, "").trim();
    return equalsIgnoreCase(normalized, grade)
        || equalsIgnoreCase(employeeGrade, grade)
        || equalsIgnoreCase(`Grade ${normalized}`, grade);
}

function uniqueSortedLabels(values) {
    return [...new Set(values.filter(Boolean))]
        .sort((left, right) => left.localeCompare(right, undefined, {
            sensitivity: "base",
            numeric: true
        }));
}

export function deriveEmployeeFilterOptions(employees = [], { districtFilter = "" } = {}) {
    const designationOptions = uniqueSortedLabels(
        employees.map((employee) => resolveEmployeeDesignationName(employee))
    ).map((value) => ({ value, label: value }));

    const serviceOptions = uniqueSortedLabels(
        employees.map((employee) => resolveEmployeeServiceLabel(employee))
    ).map((value) => ({ value, label: value }));

    const serviceLevelOptions = uniqueSortedLabels(
        employees.map((employee) => employee?.serviceLevel?.levelName)
    ).map((value) => ({ value, label: value }));

    const gradeValues = uniqueSortedLabels(
        employees
            .map((employee) => {
                const grade = employee?.grade;
                if (!grade || grade === "None" || grade === "NONE") {
                    return null;
                }
                return String(grade).replace(/^Grade\s+/i, "").trim();
            })
    );
    const gradeOptions = [
        ...GRADE_FILTER_ORDER.filter((grade) => gradeValues.includes(grade)),
        ...gradeValues.filter((grade) => !GRADE_FILTER_ORDER.includes(grade))
    ].map((value) => ({ value, label: value }));

    const officesInScope = employees.filter((employee) =>
        matchesDistrictFilter(employee, districtFilter)
    );
    const officeOptions = uniqueSortedLabels(
        officesInScope.map((employee) => resolveEmployeeOffice(employee))
    ).map((value) => ({ value, label: value }));

    return {
        designationOptions,
        serviceOptions,
        serviceLevelOptions,
        gradeOptions,
        officeOptions
    };
}

export function matchesQualificationFilter(employee, filterValue) {
    if (!filterValue) {
        return true;
    }

    if (employee?.employmentType !== "PERMANENT") {
        return false;
    }

    if (requiresProbationPeriodGate(filterValue)
        && !hasCompletedProbationYears(employee)) {
        return false;
    }

    switch (filterValue) {
    case "ANY_PENDING":
        return qualifiesForPendingQualificationAlert(employee);
    case "PENDING_PERMANENT":
        return hasPendingRequirementTypes(
            employee,
            [...PERMANENT_REQUIREMENT_TYPES, CUSTOM_PERMANENT_TYPE]
        );
    case "PENDING_GRADE_2":
        return hasPendingRequirementTypes(employee, GRADE2_REQUIREMENT_TYPES);
    case "PENDING_GRADE_1":
        return hasPendingRequirementTypes(employee, GRADE1_REQUIREMENT_TYPES);
    case CUSTOM_PERMANENT_TYPE:
    case "CUSTOM_GRADE_2_REQUIREMENT":
    case "CUSTOM_GRADE_1_REQUIREMENT":
        return hasPendingRequirementOfType(employee, filterValue);
    default:
        return isSpecificRequirementPending(employee, filterValue);
    }
}

function hasAnyPendingRequirement(employee) {
    const requirements = employee?.requirements;
    if (!Array.isArray(requirements) || requirements.length === 0) {
        return false;
    }

    return requirements.some((requirement) => requirement.status === "PENDING");
}

function qualifiesForPendingQualificationAlert(employee) {
    return hasCompletedProbationYears(employee)
        && hasAnyPendingRequirement(employee);
}

function hasPendingRequirementTypes(employee, types) {
    return types.some((type) => hasPendingRequirementOfType(employee, type));
}

function hasPendingRequirementOfType(employee, requirementType) {
    const requirements = employee?.requirements || [];
    const matching = requirements.filter(
        (requirement) => requirement.requirementType === requirementType
    );

    if (matching.length === 0) {
        return false;
    }

    return matching.some((requirement) => requirement.status === "PENDING");
}

function isSpecificRequirementPending(employee, requirementType) {
    const requirements = employee?.requirements || [];
    const requirement = requirements.find(
        (item) => item.requirementType === requirementType
    );

    if (!requirement) {
        return false;
    }

    return requirement.status === "PENDING";
}

export function matchesEmployeeSearch(employee, searchTerm) {
    if (!searchTerm?.trim()) {
        return true;
    }

    const term = searchTerm.toLowerCase().trim();
    const fullName = employee.fullName?.toLowerCase() || "";
    const sn = employee.employeeNo?.toString() || "";
    const nic = employee.nic?.toLowerCase() || "";
    const designation = employee.designation?.designationName?.toLowerCase() || "";
    const serviceLevel = employee.serviceLevel?.levelName?.toLowerCase() || "";
    const contact = employee.contactNo?.toLowerCase() || "";
    const service = resolveEmployeeService(employee);
    const serviceCode = service?.serviceCode?.toLowerCase() || "";
    const serviceDescription = service?.description?.toLowerCase() || "";

    return (
        fullName.includes(term)
        || sn.includes(term)
        || nic.includes(term)
        || designation.includes(term)
        || serviceLevel.includes(term)
        || serviceCode.includes(term)
        || serviceDescription.includes(term)
        || contact.includes(term)
    );
}

export function matchesEmployeeTypeFilter(employee, filterValue) {
    if (!filterValue || filterValue === "ALL") {
        return true;
    }

    if (PERMANENT_TRACK_FILTER_VALUES.includes(filterValue)) {
        return employee?.employmentType === "PERMANENT"
            && employee?.permanentStatus === filterValue;
    }

    if (NON_PERMANENT_EMPLOYMENT_FILTER_VALUES.includes(filterValue)) {
        return employee?.employmentType === filterValue;
    }

    if (filterValue === "TRAINING") {
        return isTrainingEmployee(employee);
    }

    return true;
}

export function filterActiveEmployees(
    employees,
    {
        searchTerm = "",
        permanentStatusFilter = "ALL",
        employmentTypeFilter = "",
        gradePromotionFilter = "ALL",
        retiringWithinMonths = "",
        districtFilter = "",
        officeFilter = "",
        designationFilter = "",
        serviceFilter = "",
        serviceLevelFilter = "",
        gradeFilter = "",
        qualificationFilter = "",
        incrementStatusFilter = "",
        privateVehicleFilter = ""
    } = {}
) {
    return employees.filter((employee) => {
        if (employmentTypeFilter
            && employee?.employmentType !== employmentTypeFilter) {
            return false;
        }

        if (!matchesEmployeeTypeFilter(employee, permanentStatusFilter)) {
            return false;
        }

        if (gradePromotionFilter !== "ALL"
            && !isQualifiedForGradePromotion(employee, gradePromotionFilter)) {
            return false;
        }

        if (!matchesRetiringWithin(employee, retiringWithinMonths)) {
            return false;
        }

        if (!matchesDistrictFilter(employee, districtFilter)) {
            return false;
        }

        if (!matchesOfficeFilter(employee, officeFilter)) {
            return false;
        }

        if (!matchesDesignationFilter(employee, designationFilter)) {
            return false;
        }

        if (!matchesServiceFilter(employee, serviceFilter)) {
            return false;
        }

        if (!matchesServiceLevelFilter(employee, serviceLevelFilter)) {
            return false;
        }

        if (!matchesGradeFilter(employee, gradeFilter)) {
            return false;
        }

        if (!matchesQualificationFilter(employee, qualificationFilter)) {
            return false;
        }

        if (!matchesIncrementStatus(employee, incrementStatusFilter)) {
            return false;
        }

        if (!matchesPrivateVehicleFilter(employee, privateVehicleFilter)) {
            return false;
        }

        return matchesEmployeeSearch(employee, searchTerm);
    });
}

export function sortEmployeesBySerialNo(employees) {
    return [...employees].sort((a, b) => {
        const snA = a.employeeNo?.toString() || "";
        const snB = b.employeeNo?.toString() || "";
        return snA.localeCompare(snB, undefined, { numeric: true });
    });
}

export function hasActiveEmployeeFilters({
    searchTerm = "",
    permanentStatusFilter = "ALL",
    employmentTypeFilter = "",
    gradePromotionFilter = "ALL",
    retiringWithinMonths = "",
    districtFilter = "",
    officeFilter = "",
    designationFilter = "",
    serviceFilter = "",
    serviceLevelFilter = "",
    gradeFilter = "",
    qualificationFilter = "",
    incrementStatusFilter = "",
    privateVehicleFilter = ""
} = {}) {
    return Boolean(searchTerm.trim())
        || permanentStatusFilter !== "ALL"
        || Boolean(employmentTypeFilter)
        || gradePromotionFilter !== "ALL"
        || Boolean(retiringWithinMonths)
        || Boolean(districtFilter)
        || Boolean(officeFilter)
        || Boolean(designationFilter)
        || Boolean(serviceFilter)
        || Boolean(serviceLevelFilter)
        || Boolean(gradeFilter)
        || Boolean(qualificationFilter)
        || Boolean(incrementStatusFilter)
        || Boolean(privateVehicleFilter);
}

export function filterInactiveEmployees(employees, searchTerm = "") {
    return employees.filter((employee) =>
        matchesEmployeeSearch(employee, searchTerm)
    );
}

export function hasInactiveEmployeeFilters({ searchTerm = "" } = {}) {
    return Boolean(searchTerm.trim());
}

export function formatEmployeeWorkplace(employee) {
    const department = employee?.currentDepartment?.trim();
    const office = employee?.currentOffice?.trim();

    if (department && office) {
        return `${department} — ${office}`;
    }

    return department || office || employee?.currentWorkingPlace || null;
}

function findOptionLabel(options, value) {
    const match = options.find((option) => option.value === value);
    return match?.label || value;
}

export function getActiveFilterLabels(filterState) {
    const labels = [];

    if (filterState.searchTerm?.trim()) {
        labels.push({
            key: "search",
            label: `Search: "${filterState.searchTerm.trim()}"`
        });
    }
    if (filterState.employmentTypeFilter) {
        labels.push({
            key: "employmentType",
            label: `Employment type: ${getEmploymentTypeLabel(
                filterState.employmentTypeFilter
            )}`
        });
    }
    if (filterState.permanentStatusFilter
        && filterState.permanentStatusFilter !== "ALL") {
        labels.push({
            key: "permanentStatus",
            label: `Permanent status: ${findOptionLabel(
                EMPLOYEE_TYPE_FILTER_OPTIONS,
                filterState.permanentStatusFilter
            )}`
        });
    }
    if (filterState.gradePromotionFilter
        && filterState.gradePromotionFilter !== "ALL") {
        labels.push({
            key: "gradePromotion",
            label: findOptionLabel(
                GRADE_PROMOTION_FILTER_OPTIONS,
                filterState.gradePromotionFilter
            )
        });
    }
    if (filterState.retiringWithinMonths) {
        labels.push({
            key: "retiringWithin",
            label: findOptionLabel(
                RETIREMENT_FILTER_OPTIONS,
                filterState.retiringWithinMonths
            )
        });
    }
    if (filterState.districtFilter) {
        labels.push({
            key: "district",
            label: `District: ${filterState.districtFilter}`
        });
    }
    if (filterState.officeFilter) {
        labels.push({
            key: "office",
            label: `Office: ${filterState.officeFilter}`
        });
    }
    if (filterState.designationFilter) {
        labels.push({
            key: "designation",
            label: `Designation: ${filterState.designationFilter}`
        });
    }
    if (filterState.serviceFilter) {
        labels.push({
            key: "service",
            label: `Service: ${filterState.serviceFilter}`
        });
    }
    if (filterState.serviceLevelFilter) {
        labels.push({
            key: "serviceLevel",
            label: `Service level: ${filterState.serviceLevelFilter}`
        });
    }
    if (filterState.gradeFilter) {
        labels.push({
            key: "grade",
            label: `Grade: ${filterState.gradeFilter}`
        });
    }
    if (filterState.qualificationFilter) {
        labels.push({
            key: "qualification",
            label: findOptionLabel(
                QUALIFICATION_FILTER_OPTIONS,
                filterState.qualificationFilter
            )
        });
    }
    if (filterState.incrementStatusFilter) {
        labels.push({
            key: "incrementStatus",
            label: findOptionLabel(
                INCREMENT_STATUS_FILTER_OPTIONS,
                filterState.incrementStatusFilter
            )
        });
    }
    if (filterState.privateVehicleFilter) {
        labels.push({
            key: "privateVehicle",
            label: findPrivateVehicleFilterLabel(filterState.privateVehicleFilter)
        });
    }

    return labels;
}

export const EMPTY_EMPLOYEE_FILTER_STATE = {
    searchTerm: "",
    permanentStatusFilter: "ALL",
    employmentTypeFilter: "",
    gradePromotionFilter: "ALL",
    retiringWithinMonths: "",
    districtFilter: "",
    officeFilter: "",
    designationFilter: "",
    serviceFilter: "",
    serviceLevelFilter: "",
    gradeFilter: "",
    qualificationFilter: "",
    incrementStatusFilter: "",
    privateVehicleFilter: ""
};

function isReportPlaceholder(value) {
    if (value === null || value === undefined) {
        return true;
    }
    const text = String(value).trim();
    return !text || text === "—";
}

const NATURE_TO_EMPLOYMENT_TYPE = {
    Permanent: "PERMANENT",
    Acting: "ACTING",
    Contract: "CONTRACT",
    Casual: "CASUAL",
    Substitute: "SUBSTITUTE",
    Training: "TRAINING"
};

export function resolveReportRowOffice(row) {
    return resolveEmployeeOffice({
        currentOffice: null,
        currentWorkingPlace: isReportPlaceholder(row?.currentWorkingPlace)
            ? null
            : row.currentWorkingPlace
    });
}

export function resolveReportRowEmploymentType(row) {
    if (isReportPlaceholder(row?.natureOfAppointment)) {
        return null;
    }
    return NATURE_TO_EMPLOYMENT_TYPE[row.natureOfAppointment] || null;
}

export function deriveReportFilterOptions(rows = [], { districtFilter = "" } = {}) {
    const usable = (value) => (isReportPlaceholder(value) ? null : String(value).trim());

    const designationOptions = uniqueSortedLabels(
        rows.map((row) => usable(row.designation))
    ).map((value) => ({ value, label: value }));

    const serviceOptions = uniqueSortedLabels(
        rows.map((row) => usable(row.service))
    ).map((value) => ({ value, label: value }));

    const serviceLevelOptions = uniqueSortedLabels(
        rows.map((row) => usable(row.serviceCategory))
    ).map((value) => ({ value, label: value }));

    const gradeValues = uniqueSortedLabels(
        rows.map((row) => {
            const grade = usable(row.grade);
            if (!grade || grade === "None" || grade === "NONE") {
                return null;
            }
            return String(grade).replace(/^Grade\s+/i, "").trim();
        })
    );
    const gradeOptions = [
        ...GRADE_FILTER_ORDER.filter((grade) =>
            gradeValues.some((value) => equalsIgnoreCase(value, grade))
        ),
        ...gradeValues.filter((grade) =>
            !GRADE_FILTER_ORDER.some((known) => equalsIgnoreCase(known, grade))
        )
    ].map((value) => ({ value, label: value }));

    const officesInScope = rows.filter((row) => {
        if (!districtFilter) {
            return true;
        }
        if (isReportPlaceholder(row.currentDistrictOfWorking)) {
            return false;
        }
        return equalsIgnoreCase(row.currentDistrictOfWorking, districtFilter);
    });
    const officeOptions = uniqueSortedLabels(
        officesInScope.map((row) => resolveReportRowOffice(row))
    ).map((value) => ({ value, label: value }));

    return {
        designationOptions,
        serviceOptions,
        serviceLevelOptions,
        gradeOptions,
        officeOptions
    };
}

function matchesReportSearch(row, searchTerm) {
    if (!searchTerm?.trim()) {
        return true;
    }

    const term = searchTerm.toLowerCase().trim();
    const fields = [
        row.serialNo,
        row.employeeName,
        row.nic,
        row.designation,
        row.serviceCategory,
        row.service,
        row.grade,
        row.natureOfAppointment,
        row.currentWorkingPlace,
        row.currentDistrictOfWorking,
        row.contactNo
    ];

    return fields.some((field) => {
        if (isReportPlaceholder(field)) {
            return false;
        }
        return String(field).toLowerCase().includes(term);
    });
}

export function filterAllEmployeeDetailsReportRows(rows = [], filterState = {}) {
    const {
        searchTerm = "",
        employmentTypeFilter = "",
        retiringWithinMonths = "",
        districtFilter = "",
        officeFilter = "",
        designationFilter = "",
        serviceFilter = "",
        serviceLevelFilter = "",
        gradeFilter = ""
    } = filterState;

    return rows.filter((row) => {
        if (employmentTypeFilter) {
            const employmentType = resolveReportRowEmploymentType(row);
            if (employmentTypeFilter === "TRAINING") {
                if (employmentType !== "TRAINING") {
                    return false;
                }
            } else if (employmentType !== employmentTypeFilter) {
                return false;
            }
        }

        if (!matchesRetiringWithin(
            { dateOfBirth: row.dateOfBirth },
            retiringWithinMonths
        )) {
            return false;
        }

        if (districtFilter) {
            if (isReportPlaceholder(row.currentDistrictOfWorking)
                || !equalsIgnoreCase(row.currentDistrictOfWorking, districtFilter)) {
                return false;
            }
        }

        if (officeFilter) {
            const office = resolveReportRowOffice(row);
            if (!office || !equalsIgnoreCase(office, officeFilter)) {
                return false;
            }
        }

        if (designationFilter) {
            if (isReportPlaceholder(row.designation)
                || !equalsIgnoreCase(row.designation, designationFilter)) {
                return false;
            }
        }

        if (serviceFilter) {
            if (isReportPlaceholder(row.service)
                || !equalsIgnoreCase(row.service, serviceFilter)) {
                return false;
            }
        }

        if (serviceLevelFilter) {
            if (isReportPlaceholder(row.serviceCategory)
                || !equalsIgnoreCase(row.serviceCategory, serviceLevelFilter)) {
                return false;
            }
        }

        if (gradeFilter) {
            if (isReportPlaceholder(row.grade)
                || !matchesGradeFilter({ grade: row.grade }, gradeFilter)) {
                return false;
            }
        }

        return matchesReportSearch(row, searchTerm);
    });
}

export function hasActiveReportFilters(filterState = {}) {
    return Boolean(filterState.searchTerm?.trim())
        || Boolean(filterState.employmentTypeFilter)
        || Boolean(filterState.retiringWithinMonths)
        || Boolean(filterState.districtFilter)
        || Boolean(filterState.officeFilter)
        || Boolean(filterState.designationFilter)
        || Boolean(filterState.serviceFilter)
        || Boolean(filterState.serviceLevelFilter)
        || Boolean(filterState.gradeFilter);
}

export function getActiveReportFilterLabels(filterState = {}) {
    return getActiveFilterLabels({
        ...EMPTY_EMPLOYEE_FILTER_STATE,
        ...filterState,
        permanentStatusFilter: "ALL",
        gradePromotionFilter: "ALL",
        qualificationFilter: "",
        incrementStatusFilter: "",
        privateVehicleFilter: ""
    });
}

export function buildAllEmployeeDetailsReportTitle(filterState = {}) {
    const baseTitle = "ALL EMPLOYEE DETAILS REPORT";
    const labels = getActiveReportFilterLabels(filterState)
        .map((filter) => filter.label)
        .filter(Boolean);

    if (labels.length === 0) {
        return baseTitle;
    }

    return `${baseTitle}\n${labels.join(", ")}`;
}
