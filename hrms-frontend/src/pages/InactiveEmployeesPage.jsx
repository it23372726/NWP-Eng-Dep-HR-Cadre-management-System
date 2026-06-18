import {
    Typography,
    Container,
    TextField,
    Stack,
    IconButton,
    InputAdornment,
    Box,
    Chip,
    Button
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import FilterListOffIcon from "@mui/icons-material/FilterListOff";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { getApiErrorMessage } from "../constants/hrms";
import { getInactiveEmployees } from "../services/employeeService";
import EmployeeListItem from "../components/EmployeeListItem";
import {
    EmployeeListEmpty,
    EmployeeListError,
    EmployeeListNotice,
    EmployeeListSkeleton
} from "../components/EmployeeListStates";
import {
    filterInactiveEmployees,
    hasInactiveEmployeeFilters,
    sortEmployeesBySerialNo
} from "../utils/employeeListFilters";

export default function InactiveEmployeesPage() {
    const [allEmployees, setAllEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [searchKeyword, setSearchKeyword] = useState("");
    const navigate = useNavigate();

    const employees = sortEmployeesBySerialNo(
        filterInactiveEmployees(allEmployees, searchKeyword)
    );

    const filtersActive = hasInactiveEmployeeFilters({ searchTerm: searchKeyword });

    const loadEmployees = useCallback(async () => {
        setLoading(true);
        setLoadError("");

        try {
            const data = await getInactiveEmployees();
            setAllEmployees(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error(error);
            setAllEmployees([]);
            setLoadError(getApiErrorMessage(error));
            toast.error(getApiErrorMessage(error));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadEmployees();
    }, [loadEmployees]);

    const openProfile = (employee) => {
        if (!employee?.id) {
            return;
        }
        navigate(`/employees/${employee.id}`);
    };

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
                            ? "No inactive employees match your search"
                            : "No inactive employee records"
                    }
                    description={
                        filtersActive
                            ? "Try a different search term"
                            : "Former employees will appear here after transfer out, retirement, resignation, death, or dismissal"
                    }
                    action={
                        filtersActive ? (
                            <Button
                                variant="outlined"
                                startIcon={<FilterListOffIcon />}
                                onClick={() => setSearchKeyword("")}
                            >
                                Clear Search
                            </Button>
                        ) : null
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
                        variant="inactive"
                        onClick={openProfile}
                    />
                ))}
            </Stack>
        );
    };

    return (
        <Container maxWidth="lg">
            <Box sx={{ mb: 3 }}>
                <Box sx={{ mb: 2 }}>
                    <Typography variant="h4" gutterBottom>
                        Inactive Employees & History
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Former employees retained for audit and career history.
                        Not included in dashboard or vacancy counts.
                    </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                    <EmployeeListNotice>
                        Select an employee to view their complete service history,
                        including final status and lifecycle actions.
                    </EmployeeListNotice>
                </Box>

                <TextField
                    label="Search inactive employees"
                    placeholder="Name, S/N, NIC, designation, service level, contact..."
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    size="small"
                    fullWidth
                    sx={{ maxWidth: 520, mb: 1.5 }}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon sx={{ color: "text.secondary" }} />
                                </InputAdornment>
                            ),
                            endAdornment: searchKeyword ? (
                                <InputAdornment position="end">
                                    <IconButton
                                        size="small"
                                        onClick={() => setSearchKeyword("")}
                                        edge="end"
                                        aria-label="Clear search"
                                    >
                                        <ClearIcon fontSize="small" />
                                    </IconButton>
                                </InputAdornment>
                            ) : null
                        }
                    }}
                />

                <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    flexWrap="wrap"
                    useFlexGap
                >
                    <Typography variant="body2" color="text.secondary">
                        {loading
                            ? "Loading employees..."
                            : `Showing ${employees.length} of ${allEmployees.length} employee${allEmployees.length !== 1 ? "s" : ""}`}
                    </Typography>
                    {filtersActive && !loading && (
                        <>
                            <Chip
                                label="Search applied"
                                size="small"
                                color="primary"
                                variant="outlined"
                            />
                            <Button
                                size="small"
                                startIcon={<FilterListOffIcon />}
                                onClick={() => setSearchKeyword("")}
                            >
                                Clear
                            </Button>
                        </>
                    )}
                </Stack>
            </Box>

            {renderListContent()}
        </Container>
    );
}
