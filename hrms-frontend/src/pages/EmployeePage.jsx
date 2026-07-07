import {
    Typography,
    Container,
    Button,
    Stack,
    Box,
    Tabs,
    Tab,
    Paper,
    Chip,
    ToggleButton,
    ToggleButtonGroup
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import FilterListOffIcon from "@mui/icons-material/FilterListOff";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import GridViewIcon from "@mui/icons-material/GridView";
import ViewListIcon from "@mui/icons-material/ViewList";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useSearchParams } from "react-router-dom";

import { getApiErrorMessage } from "../constants/hrms";
import {
    getActiveEmployees,
    createEmployee,
    saveEmployeePhoto
} from "../services/employeeService";
import EmployeeForm from "../components/EmployeeForm";
import EmployeeListItem from "../components/EmployeeListItem";
import ActiveEmployeeCard from "../components/ActiveEmployeeCard";
import ActiveEmployeeSummaryCards from "../components/ActiveEmployeeSummaryCards";
import EmployeeListFilterPanel from "../components/EmployeeListFilterPanel";
import {
    EmployeeListEmpty,
    EmployeeListError,
    EmployeeListSkeleton
} from "../components/EmployeeListStates";
import {
    filterActiveEmployees,
    hasActiveEmployeeFilters,
    sortEmployeesBySerialNo
} from "../utils/employeeListFilters";
import { computeActiveEmployeeStats } from "../utils/activeEmployeeStats";
import {
    employeeFiltersToSearchParams,
    parseEmployeeListSearchParams
} from "../utils/dashboardNavigation";

const VIEW_MODE_STORAGE_KEY = "hrms.activeEmployees.viewMode";

function loadViewMode() {
    try {
        const stored = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
        return stored === "list" ? "list" : "grid";
    } catch {
        return "grid";
    }
}

function resolveActiveShortcut(filterState) {
    if (filterState.permanentStatusFilter === "PROBATION") {
        return "probation";
    }
    if (filterState.permanentStatusFilter === "QUALIFIED_FOR_PERMANENT") {
        return "qualified";
    }
    if (filterState.permanentStatusFilter === "PERMANENT") {
        return "confirmed";
    }
    if (filterState.permanentStatusFilter === "ACTING") {
        return "acting";
    }
    if (filterState.permanentStatusFilter === "CONTRACT") {
        return "contract";
    }
    if (filterState.permanentStatusFilter === "CASUAL") {
        return "casual";
    }
    if (filterState.permanentStatusFilter === "SUBSTITUTE") {
        return "substitute";
    }
    if (filterState.gradePromotionFilter === "QUALIFIED_GRADE_3_TO_2"
        || filterState.gradePromotionFilter === "QUALIFIED_GRADE_2_TO_1"
        || filterState.gradePromotionFilter === "QUALIFIED_GRADE_1_TO_SUPRA"
        || filterState.gradePromotionFilter === "QUALIFIED_GRADE_1_TO_SPECIAL") {
        return "promotion";
    }
    if (filterState.retiringWithinMonths === "24") {
        return "retirement";
    }
    if (filterState.privateVehicleFilter === "HAS_PRIVATE_VEHICLE") {
        return "privateVehicle";
    }
    if (filterState.privateVehicleFilter === "EXPIRED") {
        return "privateVehicleExpired";
    }
    if (filterState.privateVehicleFilter === "NEAR_EXPIRE") {
        return "privateVehicleNearExpire";
    }
    if (filterState.privateVehicleFilter === "RENTED") {
        return "privateVehicleRented";
    }
    return null;
}

export default function EmployeePage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [allEmployees, setAllEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [open, setOpen] = useState(false);
    const [creatingEmployee, setCreatingEmployee] = useState(false);
    const [searchKeyword, setSearchKeyword] = useState("");
    const [permanentStatusFilter, setPermanentStatusFilter] = useState("ALL");
    const [employmentTypeFilter, setEmploymentTypeFilter] = useState("");
    const [gradePromotionFilter, setGradePromotionFilter] = useState("ALL");
    const [retiringWithinMonths, setRetiringWithinMonths] = useState("");
    const [districtFilter, setDistrictFilter] = useState("");
    const [officeFilter, setOfficeFilter] = useState("");
    const [qualificationFilter, setQualificationFilter] = useState("");
    const [incrementStatusFilter, setIncrementStatusFilter] = useState("");
    const [privateVehicleFilter, setPrivateVehicleFilter] = useState("");
    const [departmentScope, setDepartmentScope] = useState("NWP");
    const [filtersExpanded, setFiltersExpanded] = useState(true);
    const [viewMode, setViewMode] = useState(loadViewMode);

    const navigate = useNavigate();

    useEffect(() => {
        const parsed = parseEmployeeListSearchParams(searchParams);

        if ((parsed.departmentScope === "OTHER"
                || parsed.departmentScope === "SYSTEM_PENDING")
            && (parsed.districtFilter || parsed.officeFilter)) {
            setSearchParams(
                employeeFiltersToSearchParams({
                    ...parsed,
                    districtFilter: "",
                    officeFilter: ""
                }),
                { replace: true }
            );
            return;
        }

        setSearchKeyword(parsed.searchTerm);
        setPermanentStatusFilter(parsed.permanentStatusFilter);
        setEmploymentTypeFilter(parsed.employmentTypeFilter);
        setGradePromotionFilter(parsed.gradePromotionFilter);
        setRetiringWithinMonths(parsed.retiringWithinMonths);
        setDistrictFilter(parsed.districtFilter);
        setOfficeFilter(parsed.officeFilter);
        setQualificationFilter(parsed.qualificationFilter);
        setIncrementStatusFilter(parsed.incrementStatusFilter);
        setPrivateVehicleFilter(parsed.privateVehicleFilter);
        setDepartmentScope(parsed.departmentScope);
    }, [searchParams, setSearchParams]);

    const filterState = {
        searchTerm: searchKeyword,
        permanentStatusFilter,
        employmentTypeFilter,
        gradePromotionFilter,
        retiringWithinMonths,
        districtFilter,
        officeFilter,
        qualificationFilter,
        incrementStatusFilter,
        privateVehicleFilter
    };

    const syncFiltersToUrl = useCallback((nextFilters) => {
        const params = employeeFiltersToSearchParams({
            ...filterState,
            departmentScope,
            ...nextFilters
        });
        setSearchParams(params, { replace: true });
    }, [departmentScope, filterState, setSearchParams]);

    const employees = sortEmployeesBySerialNo(
        filterActiveEmployees(allEmployees, filterState)
    );

    const stats = useMemo(
        () => computeActiveEmployeeStats(allEmployees),
        [allEmployees]
    );

    const filtersActive = hasActiveEmployeeFilters(filterState);
    const activeShortcut = resolveActiveShortcut(filterState);

    const loadEmployees = useCallback(async () => {
        setLoading(true);
        setLoadError("");

        try {
            const data = await getActiveEmployees(departmentScope);
            setAllEmployees(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error(error);
            setAllEmployees([]);
            setLoadError(getApiErrorMessage(error));
            toast.error(getApiErrorMessage(error));
        } finally {
            setLoading(false);
        }
    }, [departmentScope]);

    useEffect(() => {
        loadEmployees();
    }, [loadEmployees]);

    const handleCreate = async (data, photoOptions) => {
        if (creatingEmployee) {
            return;
        }

        setCreatingEmployee(true);
        try {
            const saved = await createEmployee(data);
            await saveEmployeePhoto(saved.id, photoOptions);
            toast.success("Employee created successfully");
            setOpen(false);
            loadEmployees();
        } catch (error) {
            console.error(error);
            toast.error(getApiErrorMessage(error));
        } finally {
            setCreatingEmployee(false);
        }
    };

    const clearFilters = () => {
        setSearchParams(
            departmentScope !== "NWP"
                ? employeeFiltersToSearchParams({ departmentScope })
                : new URLSearchParams(),
            { replace: true }
        );
    };

    const clearFilterKey = (key) => {
        const updates = {
            permanentStatus: { permanentStatusFilter: "ALL" },
            employmentType: { employmentTypeFilter: "" },
            gradePromotion: { gradePromotionFilter: "ALL" },
            retiringWithin: { retiringWithinMonths: "" },
            district: { districtFilter: "", officeFilter: "" },
            office: { officeFilter: "" },
            qualification: { qualificationFilter: "" },
            incrementStatus: { incrementStatusFilter: "" },
            privateVehicle: { privateVehicleFilter: "" },
            search: { searchTerm: "" }
        }[key];

        if (updates) {
            syncFiltersToUrl(updates);
        }
    };

    const handleFilterShortcut = (key, filter) => {
        if (activeShortcut === key) {
            clearFilters();
            return;
        }
        syncFiltersToUrl(filter);
        setFiltersExpanded(true);
    };

    const handleViewModeChange = (_, nextMode) => {
        if (!nextMode) {
            return;
        }
        setViewMode(nextMode);
        try {
            localStorage.setItem(VIEW_MODE_STORAGE_KEY, nextMode);
        } catch {
            // ignore storage errors
        }
    };

    const openProfile = (employee) => {
        if (!employee?.id) {
            return;
        }
        navigate(`/employees/${employee.id}`);
    };

    const resultSummary = loading
        ? "Loading employees..."
        : `Showing ${employees.length} of ${allEmployees.length} employee${allEmployees.length !== 1 ? "s" : ""}`;

    const departmentLabel = departmentScope === "NWP"
        ? "N.W.P. Engineering Department"
        : departmentScope === "SYSTEM_PENDING"
            ? "System Pending Employees"
            : "Other Departments";
    const isSystemPendingScope = departmentScope === "SYSTEM_PENDING";

    const renderListContent = () => {
        if (loading) {
            return <EmployeeListSkeleton variant={viewMode} />;
        }

        if (loadError) {
            return (
                <EmployeeListError
                    message={loadError}
                    onRetry={loadEmployees}
                />
            );
        }

        if (employees.length === 0) {
            return (
                <EmployeeListEmpty
                    variant={filtersActive ? "filtered" : "empty"}
                    title={
                        filtersActive
                            ? "No employees match your search or filters"
                            : isSystemPendingScope
                                ? "No system pending employees"
                                : departmentScope === "NWP"
                                    ? "No active employees in N.W.P. Engineering Department"
                                    : "No active employees in other departments"
                    }
                    description={
                        filtersActive
                            ? "Try adjusting your search or filter criteria"
                            : isSystemPendingScope
                                ? "Employees without career history appear here after quick profile entry"
                                : "Add a new employee to get started"
                    }
                    action={
                        !filtersActive ? (
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={() => setOpen(true)}
                            >
                                Add Employee
                            </Button>
                        ) : (
                            <Button
                                variant="outlined"
                                startIcon={<FilterListOffIcon />}
                                onClick={clearFilters}
                            >
                                Clear Filters
                            </Button>
                        )
                    }
                />
            );
        }

        if (viewMode === "grid") {
            return (
                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: {
                            xs: "1fr",
                            sm: "repeat(2, 1fr)",
                            lg: "repeat(3, 1fr)"
                        },
                        gap: 2
                    }}
                >
                    {employees.map((employee) => (
                        <ActiveEmployeeCard
                            key={employee.id}
                            employee={employee}
                            onClick={openProfile}
                        />
                    ))}
                </Box>
            );
        }

        return (
            <Stack spacing={1.5}>
                {employees.map((employee) => (
                    <EmployeeListItem
                        key={employee.id}
                        employee={employee}
                        variant="active"
                        onClick={openProfile}
                    />
                ))}
            </Stack>
        );
    };

    return (
        <Container maxWidth="xl">
            <Paper
                variant="outlined"
                sx={{
                    p: { xs: 2, sm: 3 },
                    mb: 3,
                    borderRadius: 2,
                    bgcolor: "background.paper"
                }}
            >
                <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={2}
                    sx={{ justifyContent: "space-between", alignItems: { sm: "center" } }}
                >
                    <Stack direction="row" spacing={2} alignItems="flex-start">
                        <Box
                            sx={{
                                p: 1.5,
                                borderRadius: 2,
                                bgcolor: "primary.50",
                                display: { xs: "none", sm: "flex" },
                                alignItems: "center",
                                justifyContent: "center"
                            }}
                        >
                            <PeopleAltIcon sx={{ color: "primary.main", fontSize: 32 }} />
                        </Box>
                        <Box>
                            <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                                Active Employees
                            </Typography>
                            <Typography variant="body1" color="text.secondary">
                                Browse, search, and manage active staff across departments.
                                Click a summary card to filter, or use the panel below.
                            </Typography>
                            {!loading && allEmployees.length > 0 && (
                                <Stack
                                    direction="row"
                                    spacing={1}
                                    flexWrap="wrap"
                                    useFlexGap
                                    sx={{ mt: 1.5 }}
                                >
                                    {departmentScope === "NWP" && (
                                        <>
                                            <Chip
                                                size="small"
                                                label={`${stats.kurunegala} Kurunegala`}
                                                variant="outlined"
                                            />
                                            <Chip
                                                size="small"
                                                label={`${stats.puttalam} Puttalam`}
                                                variant="outlined"
                                            />
                                        </>
                                    )}
                                    <Chip
                                        size="small"
                                        label={departmentLabel}
                                        color="primary"
                                        variant="outlined"
                                    />
                                </Stack>
                            )}
                        </Box>
                    </Stack>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setOpen(true)}
                        sx={{ alignSelf: { xs: "flex-start", sm: "center" }, flexShrink: 0 }}
                    >
                        Add Employee
                    </Button>
                </Stack>
            </Paper>

            <Paper
                variant="outlined"
                sx={{ mb: 3, borderRadius: 2, overflow: "hidden" }}
            >
                <Tabs
                    value={departmentScope}
                    onChange={(_, value) => {
                        syncFiltersToUrl({
                            departmentScope: value,
                            ...(value === "OTHER" || value === "SYSTEM_PENDING"
                                ? { districtFilter: "", officeFilter: "" }
                                : {})
                        });
                    }}
                    sx={{
                        px: 2,
                        bgcolor: "grey.50",
                        borderBottom: 1,
                        borderColor: "divider"
                    }}
                >
                    <Tab label="N.W.P. Engineering Department" value="NWP" />
                    <Tab label="Other Departments" value="OTHER" />
                    <Tab label="System Pending Employees" value="SYSTEM_PENDING" />
                </Tabs>
            </Paper>

            <ActiveEmployeeSummaryCards
                stats={stats}
                loading={loading}
                activeShortcut={activeShortcut}
                onFilterShortcut={isSystemPendingScope ? undefined : handleFilterShortcut}
                variant={isSystemPendingScope ? "pending" : "default"}
            />

            <EmployeeListFilterPanel
                filterState={filterState}
                onFilterChange={syncFiltersToUrl}
                onClearFilters={clearFilters}
                onClearFilterKey={clearFilterKey}
                filtersActive={filtersActive}
                resultSummary={resultSummary}
                expanded={filtersExpanded}
                onToggleExpanded={() => setFiltersExpanded((prev) => !prev)}
                showDistrictFilter={departmentScope === "NWP"}
                compact={isSystemPendingScope}
            />

            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 2,
                    mb: 2,
                    px: 0.5,
                    minHeight: 36
                }}
            >
                <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                        lineHeight: 1,
                        display: "flex",
                        alignItems: "center"
                    }}
                >
                    {loading
                        ? "Loading employees..."
                        : employees.length > 0
                            ? `${employees.length} employee${employees.length !== 1 ? "s" : ""} displayed`
                            : resultSummary}
                </Typography>
                <ToggleButtonGroup
                    size="small"
                    value={viewMode}
                    exclusive
                    onChange={handleViewModeChange}
                    aria-label="Employee list view mode"
                    sx={{ flexShrink: 0 }}
                >
                    <ToggleButton value="grid" aria-label="Card grid view">
                        <GridViewIcon fontSize="small" />
                    </ToggleButton>
                    <ToggleButton value="list" aria-label="Compact list view">
                        <ViewListIcon fontSize="small" />
                    </ToggleButton>
                </ToggleButtonGroup>
            </Box>

            {renderListContent()}

            <EmployeeForm
                open={open}
                handleClose={() => setOpen(false)}
                handleSubmit={handleCreate}
                selectedEmployee={null}
                saving={creatingEmployee}
            />
        </Container>
    );
}
