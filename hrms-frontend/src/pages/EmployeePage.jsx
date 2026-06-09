import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Typography,
    Container,
    Button,
    TextField,
    Stack,
    IconButton,
    InputAdornment,
    Box,
    MenuItem
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
    getApiErrorMessage,
    PERMANENT_STATUS_OPTIONS
} from "../constants/hrms";

import {
    getActiveEmployees,
    createEmployee,
    updateEmployee
} from "../services/employeeService";

import EmployeeStatusChip from "../components/EmployeeStatusChip";
import PermanentStatusChip from "../components/PermanentStatusChip";

import EmployeeForm
from "../components/EmployeeForm";

import { useNavigate }
from "react-router-dom";

// Helper function to filter employees by multiple fields
const filterEmployees = (employees, searchTerm, permanentStatusFilter) => {
    const statusFiltered = permanentStatusFilter === "ALL"
        ? employees
        : employees.filter(
            (emp) => emp.permanentStatus === permanentStatusFilter
        );

    if (!searchTerm.trim()) return statusFiltered;
    
    const term = searchTerm.toLowerCase().trim();
    
    return statusFiltered.filter(emp => {
        const fullName = emp.fullName?.toLowerCase() || "";
        const sn = emp.employeeNo?.toString() || "";
        const nic = emp.nic?.toLowerCase() || "";
        const designation = emp.designation?.designationName?.toLowerCase() || "";
        const serviceLevel = emp.serviceLevel?.levelName?.toLowerCase() || "";
        const contact = emp.contactNo?.toLowerCase() || "";
        
        return (
            fullName.includes(term) ||
            sn.includes(term) ||
            nic.includes(term) ||
            designation.includes(term) ||
            serviceLevel.includes(term) ||
            contact.includes(term)
        );
    });
};

// Helper function to sort employees by S/N
const sortEmployeesBySN = (employees) => {
    return [...employees].sort((a, b) => {
        const snA = a.employeeNo?.toString() || "";
        const snB = b.employeeNo?.toString() || "";
        return snA.localeCompare(snB, undefined, { numeric: true });
    });
};

export default function EmployeePage() {

    const [allEmployees, setAllEmployees] =
        useState([]);

    const [open, setOpen] =
        useState(false);

    const [selectedEmployee, setSelectedEmployee] =
        useState(null);

    const [searchKeyword, setSearchKeyword] =
        useState("");

    const [permanentStatusFilter, setPermanentStatusFilter] =
        useState("ALL");

    const navigate = useNavigate();

    // Filter and sort employees based on search term and S/N
    const employees = sortEmployeesBySN(
        filterEmployees(allEmployees, searchKeyword, permanentStatusFilter)
    );

    useEffect(() => {

        loadEmployees();

    }, []);

    const loadEmployees = async () => {

        try {

            const data = await getActiveEmployees();

            setAllEmployees(data);

        } catch (error) {

            console.error(error);

            toast.error(
                "Failed to load employees"
            );
        }
    };

    const handleCreate = async (data) => {

        try {

            await createEmployee(data);

            toast.success(
                "Employee created successfully"
            );

            setOpen(false);

            loadEmployees();

        } catch (error) {

            console.error(error);

            toast.error(getApiErrorMessage(error));
        }
    };

    const handleUpdate = async (data) => {

        try {

            await updateEmployee(
                selectedEmployee.id,
                data
            );

            toast.success(
                "Employee updated successfully"
            );

            setOpen(false);

            setSelectedEmployee(null);

            loadEmployees();

        } catch (error) {

            console.error(error);

            toast.error(getApiErrorMessage(error));
        }
    };

    return (

        <Container sx={{ mt: 5 }}>

            <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={2}
                sx={{ mb: 3, alignItems: "center" }}
            >

                <Button
                    variant="contained"
                    onClick={() => {

                        setSelectedEmployee(null);

                        setOpen(true);
                    }}
                >
                    Add Employee
                </Button>

                <TextField
                    label="Search Active Employees"
                    placeholder="Name, S/N, NIC, designation, service level, contact..."
                    value={searchKeyword}
                    onChange={(e) =>
                        setSearchKeyword(
                            e.target.value
                        )
                    }
                    size="small"
                    sx={{ minWidth: 300, flexGrow: 1 }}
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

                <TextField
                    label="Permanent Status"
                    select
                    size="small"
                    value={permanentStatusFilter}
                    onChange={(e) => setPermanentStatusFilter(e.target.value)}
                    sx={{ minWidth: 220 }}
                >
                    {PERMANENT_STATUS_OPTIONS.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                            {option.label}
                        </MenuItem>
                    ))}
                </TextField>

            </Stack>

            <Box sx={{ mb: 2 }}>
                <Typography variant="h4" gutterBottom>
                    Active Employees
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Showing {employees.length} of {allEmployees.length} employee{allEmployees.length !== 1 ? "s" : ""}
                </Typography>
            </Box>

            {employees.length === 0 && searchKeyword ? (
                <Paper sx={{ p: 3, textAlign: "center" }}>
                    <Typography color="text.secondary" gutterBottom>
                        No employees found
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        Try a different search term
                    </Typography>
                </Paper>
            ) : (
            <TableContainer component={Paper}>

                <Table>

                    <TableHead>

                        <TableRow>

                            <TableCell>
                                S/N
                            </TableCell>

                            <TableCell>
                                Full Name
                            </TableCell>

                            <TableCell>
                                NIC
                            </TableCell>

                            <TableCell>
                                Grade
                            </TableCell>

                            <TableCell>
                                Designation
                            </TableCell>

                            <TableCell>
                                Service Level
                            </TableCell>

                            <TableCell>
                                Service
                            </TableCell>

                            <TableCell>
                                Status
                            </TableCell>

                            <TableCell>
                                Permanent Status
                            </TableCell>

                            <TableCell>
                                Actions
                            </TableCell>

                        </TableRow>

                    </TableHead>

                    <TableBody>

                        {employees.map((employee) => (

                            <TableRow
                                key={employee.id}
                            >

                                <TableCell>
                                    {employee.employeeNo}
                                </TableCell>

                                <TableCell>
                                    {employee.fullName}
                                </TableCell>

                                <TableCell>
                                    {employee.nic}
                                </TableCell>

                                <TableCell>
                                    {employee.grade ?? "—"}
                                </TableCell>

                                <TableCell>
                                    {employee.designation?.designationName ?? "—"}
                                </TableCell>

                                <TableCell>
                                    {employee.serviceLevel?.levelName ?? "—"}
                                </TableCell>

                                <TableCell>
                                    {employee.designation?.service?.serviceCode ?? "—"}
                                </TableCell>

                                <TableCell>
                                    <EmployeeStatusChip
                                        status={employee.status}
                                    />
                                </TableCell>

                                <TableCell>
                                    <PermanentStatusChip
                                        status={employee.permanentStatus}
                                    />
                                </TableCell>

                                <TableCell>
                                    <Button
                                        size="small"
                                        onClick={() =>
                                            navigate(
                                                `/employees/${employee.id}`
                                            )
                                        }
                                    >
                                        View
                                    </Button>

                                    <Button
                                        size="small"
                                        onClick={() => {

                                            setSelectedEmployee(employee);

                                            setOpen(true);
                                        }}
                                    >
                                        Edit
                                    </Button>

                                </TableCell>

                            </TableRow>
                        ))}

                    </TableBody>

                </Table>

            </TableContainer>
            )}

            <EmployeeForm
                open={open}
                handleClose={() => {

                    setOpen(false);

                    setSelectedEmployee(null);
                }}
                handleSubmit={
                    selectedEmployee
                        ? handleUpdate
                        : handleCreate
                }
                selectedEmployee={
                    selectedEmployee
                }
            />

        </Container>
    );
}