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
    TextField,
    Stack,
    IconButton,
    InputAdornment,
    Box
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import Button from "@mui/material/Button";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import {
    getInactiveEmployees
} from "../services/employeeService";
import EmployeeStatusChip from "../components/EmployeeStatusChip";

// Helper function to filter employees by multiple fields
const filterEmployees = (employees, searchTerm) => {
    if (!searchTerm.trim()) return employees;
    
    const term = searchTerm.toLowerCase().trim();
    
    return employees.filter(emp => {
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

export default function InactiveEmployeesPage() {
    const [allEmployees, setAllEmployees] = useState([]);
    const [searchKeyword, setSearchKeyword] = useState("");
    const navigate = useNavigate();

    // Filter and sort employees based on search term and S/N
    const employees = sortEmployeesBySN(filterEmployees(allEmployees, searchKeyword));

    useEffect(() => {
        loadEmployees();
    }, []);

    const loadEmployees = async () => {
        try {
            const data = await getInactiveEmployees();
            setAllEmployees(data);
        } catch {
            toast.error("Failed to load inactive employees");
        }
    };

    return (
        <Container>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mb: 3, alignItems: "center" }}>
                <TextField
                    label="Search Inactive Employees"
                    placeholder="Name, S/N, NIC, designation, service level, contact..."
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
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
            </Stack>

            <Box sx={{ mb: 2 }}>
                <Typography variant="h4" gutterBottom>
                    Inactive Employees & History
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Showing {employees.length} of {allEmployees.length} employee{allEmployees.length !== 1 ? "s" : ""}
                </Typography>
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Former employees retained for audit. Not included in dashboard
                or vacancy counts.
            </Typography>

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
                            <TableCell>S/N</TableCell>
                            <TableCell>Name</TableCell>
                            <TableCell>Designation</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {employees.map((employee) => (
                            <TableRow key={employee.id}>
                                <TableCell>{employee.employeeNo}</TableCell>
                                <TableCell>{employee.fullName}</TableCell>
                                <TableCell>
                                    {employee.designation?.designationName ?? "—"}
                                </TableCell>
                                <TableCell>
                                    <EmployeeStatusChip
                                        status={employee.status}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Button
                                        size="small"
                                        onClick={() =>
                                            navigate(`/employees/${employee.id}`)
                                        }
                                    >
                                        View History
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
            )}
        </Container>
    );
}
