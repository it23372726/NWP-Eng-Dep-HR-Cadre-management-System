const ALLOWED_EMPLOYEE_LIST_PATHS = new Set([
    "/employees",
    "/employees/inactive"
]);

const FALLBACK_EMPLOYEE_LIST_PATH = "/employees";

export function captureEmployeeListOrigin(location) {
    return {
        pathname: typeof location?.pathname === "string" ? location.pathname : FALLBACK_EMPLOYEE_LIST_PATH,
        search: typeof location?.search === "string" ? location.search : ""
    };
}

export function resolveEmployeeListReturnTo(origin) {
    const safePathname =
        typeof origin?.pathname === "string"
        && ALLOWED_EMPLOYEE_LIST_PATHS.has(origin.pathname)
            ? origin.pathname
            : FALLBACK_EMPLOYEE_LIST_PATH;

    const safeSearch =
        typeof origin?.search === "string"
        && (origin.search === "" || origin.search.startsWith("?"))
            ? origin.search
            : "";

    return `${safePathname}${safeSearch}`;
}
