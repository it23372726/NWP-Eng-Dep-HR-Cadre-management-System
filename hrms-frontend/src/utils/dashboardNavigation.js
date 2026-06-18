export const EMPLOYEE_FILTER_PARAMS = {
    permanentStatus: "permanentStatus",
    gradePromotion: "gradePromotion",
    retiringWithin: "retiringWithin",
    district: "district",
    office: "office",
    qualification: "qualification",
    search: "q",
    departmentScope: "departmentScope"
};

const DEFAULT_EMPLOYEE_FILTERS = {
    permanentStatus: "ALL",
    gradePromotion: "ALL",
    retiringWithin: "",
    district: "",
    office: "",
    qualification: "",
    search: "",
    departmentScope: "NWP"
};

function resolveQualificationFilter(searchParams) {
    const qualification = searchParams.get(EMPLOYEE_FILTER_PARAMS.qualification);
    if (qualification) {
        return qualification;
    }

    const legacyDataQuality = searchParams.get("dataQuality");
    if (legacyDataQuality === "MISSING_QUALIFICATIONS") {
        return "ANY_PENDING";
    }

    return "";
}

export function buildEmployeeListUrl(filters = {}) {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
        if (!value || value === "ALL") {
            return;
        }
        const paramKey = EMPLOYEE_FILTER_PARAMS[key] || key;
        params.set(paramKey, String(value));
    });

    const query = params.toString();
    return query ? `/employees?${query}` : "/employees";
}

export function buildVacancyReportUrl() {
    return "/vacancies";
}

export function buildDashboardAlertUrl(alert) {
    if (!alert?.actionPath) {
        return null;
    }
    if (alert.actionQuery) {
        return `${alert.actionPath}?${alert.actionQuery}`;
    }
    return alert.actionPath;
}

export function parseEmployeeListSearchParams(searchParams) {
    const get = (key, fallback = "") => searchParams.get(key) || fallback;

    return {
        searchTerm: get(EMPLOYEE_FILTER_PARAMS.search),
        permanentStatusFilter: get(
            EMPLOYEE_FILTER_PARAMS.permanentStatus,
            DEFAULT_EMPLOYEE_FILTERS.permanentStatus
        ),
        gradePromotionFilter: get(
            EMPLOYEE_FILTER_PARAMS.gradePromotion,
            DEFAULT_EMPLOYEE_FILTERS.gradePromotion
        ),
        retiringWithinMonths: get(EMPLOYEE_FILTER_PARAMS.retiringWithin),
        districtFilter: get(EMPLOYEE_FILTER_PARAMS.district),
        officeFilter: get(EMPLOYEE_FILTER_PARAMS.office),
        qualificationFilter: resolveQualificationFilter(searchParams),
        departmentScope: get(
            EMPLOYEE_FILTER_PARAMS.departmentScope,
            DEFAULT_EMPLOYEE_FILTERS.departmentScope
        )
    };
}

export function employeeFiltersToSearchParams(filterState) {
    const params = new URLSearchParams();

    if (filterState.searchTerm?.trim()) {
        params.set(EMPLOYEE_FILTER_PARAMS.search, filterState.searchTerm.trim());
    }
    if (filterState.permanentStatusFilter
        && filterState.permanentStatusFilter !== "ALL") {
        params.set(
            EMPLOYEE_FILTER_PARAMS.permanentStatus,
            filterState.permanentStatusFilter
        );
    }
    if (filterState.gradePromotionFilter
        && filterState.gradePromotionFilter !== "ALL") {
        params.set(
            EMPLOYEE_FILTER_PARAMS.gradePromotion,
            filterState.gradePromotionFilter
        );
    }
    if (filterState.retiringWithinMonths) {
        params.set(
            EMPLOYEE_FILTER_PARAMS.retiringWithin,
            String(filterState.retiringWithinMonths)
        );
    }
    if (filterState.districtFilter) {
        params.set(EMPLOYEE_FILTER_PARAMS.district, filterState.districtFilter);
    }
    if (filterState.officeFilter) {
        params.set(EMPLOYEE_FILTER_PARAMS.office, filterState.officeFilter);
    }
    if (filterState.qualificationFilter) {
        params.set(
            EMPLOYEE_FILTER_PARAMS.qualification,
            filterState.qualificationFilter
        );
    }
    if (filterState.departmentScope
        && filterState.departmentScope !== "NWP") {
        params.set(
            EMPLOYEE_FILTER_PARAMS.departmentScope,
            filterState.departmentScope
        );
    }

    return params;
}
