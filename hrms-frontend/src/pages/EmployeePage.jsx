import {
    Typography,
    Container,
    Button,
    Stack,
    Box,
    Tabs,
    Tab
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import FilterListOffIcon from "@mui/icons-material/FilterListOff";
import { useCallback, useEffect, useState } from "react";
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
import {
    employeeFiltersToSearchParams,
    parseEmployeeListSearchParams
} from "../utils/dashboardNavigation";

export default function EmployeePage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [allEmployees, setAllEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [open, setOpen] = useState(false);
    const [creatingEmployee, setCreatingEmployee] = useState(false);
    const [searchKeyword, setSearchKeyword] = useState("");
    const [permanentStatusFilter, setPermanentStatusFilter] = useState("ALL");
    const [gradePromotionFilter, setGradePromotionFilter] = useState("ALL");
    const [retiringWithinMonths, setRetiringWithinMonths] = useState("");
    const [districtFilter, setDistrictFilter] = useState("");
    const [officeFilter, setOfficeFilter] = useState("");
    const [qualificationFilter, setQualificationFilter] = useState("");
    const [departmentScope, setDepartmentScope] = useState("NWP");

    const navigate = useNavigate();

    useEffect(() => {
        const parsed = parseEmployeeListSearchParams(searchParams);
        setSearchKeyword(parsed.searchTerm);
        setPermanentStatusFilter(parsed.permanentStatusFilter);
        setGradePromotionFilter(parsed.gradePromotionFilter);
        setRetiringWithinMonths(parsed.retiringWithinMonths);
        setDistrictFilter(parsed.districtFilter);
        setOfficeFilter(parsed.officeFilter);
        setQualificationFilter(parsed.qualificationFilter);
        setDepartmentScope(parsed.departmentScope);
    }, [searchParams]);

    const filterState = {
        searchTerm: searchKeyword,
        permanentStatusFilter,
        gradePromotionFilter,
        retiringWithinMonths,
        districtFilter,
        officeFilter,
        qualificationFilter
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

    const filtersActive = hasActiveEmployeeFilters(filterState);

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
            gradePromotion: { gradePromotionFilter: "ALL" },
            retiringWithin: { retiringWithinMonths: "" },
            district: { districtFilter: "", officeFilter: "" },
            office: { officeFilter: "" },
            qualification: { qualificationFilter: "" },
            search: { searchTerm: "" }
        }[key];

        if (updates) {
            syncFiltersToUrl(updates);
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

    const renderListContent = () => {
        if (loading) {
            return <EmployeeListSkeleton />;
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
                            : departmentScope === "NWP"
                                ? "No active employees in N.W.P. Engineering Department"
                                : "No active employees in other departments"
                    }
                    description={
                        filtersActive
                            ? "Try adjusting your search or filter criteria"
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
        <Container maxWidth="lg">
            <Box sx={{ mb: 3 }}>
                <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={2}
                    sx={{ mb: 2, justifyContent: "space-between", alignItems: { sm: "center" } }}
                >
                    <Box>
                        <Typography variant="h4" gutterBottom>
                            Active Employees
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            Browse and filter active staff. Use the same filters
                            available from the dashboard to find employees needing action.
                        </Typography>
                    </Box>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setOpen(true)}
                        sx={{ alignSelf: { xs: "flex-start", sm: "center" }, flexShrink: 0 }}
                    >
                        Add Employee
                    </Button>
                </Stack>

                <Tabs
                    value={departmentScope}
                    onChange={(_, value) => {
                        syncFiltersToUrl({ departmentScope: value });
                    }}
                    sx={{ mb: 2 }}
                >
                    <Tab label="N.W.P. Engineering Department" value="NWP" />
                    <Tab label="Other Departments" value="OTHER" />
                </Tabs>

                <EmployeeListFilterPanel
                    filterState={filterState}
                    onFilterChange={syncFiltersToUrl}
                    onClearFilters={clearFilters}
                    onClearFilterKey={clearFilterKey}
                    filtersActive={filtersActive}
                    resultSummary={resultSummary}
                />
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
