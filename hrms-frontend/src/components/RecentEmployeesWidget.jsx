import { useNavigate } from "react-router-dom";
import {
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    Skeleton,
    Alert
} from "@mui/material";

const formatDate = (date) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-GB");
};

export default function RecentEmployeesWidget({ data, loading }) {
    const navigate = useNavigate();
    if (loading) {
        return (
            <Paper sx={{ p: 3, borderRadius: 2 }}>
                <Skeleton variant="text" width="40%" height={32} />
                {[1, 2, 3].map(i => (
                    <Skeleton key={i} variant="rectangular" height={40} sx={{ mt: 1 }} />
                ))}
            </Paper>
        );
    }

    if (!data || data.length === 0) {
        return (
            <Paper sx={{ p: 3, borderRadius: 2 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Recently Added Employees</Typography>
                <Alert severity="info">No recent employees</Alert>
            </Paper>
        );
    }

    return (
        <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 700 }}>
                Recently Added Employees
            </Typography>
            <TableContainer>
                <Table>
                    <TableHead>
                        <TableRow sx={{ bgcolor: "#F1F5F9" }}>
                            <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Designation</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700 }}>Added Date</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {data.map((employee, index) => (
                            <TableRow
                                key={index}
                                hover
                                sx={{ cursor: "pointer" }}
                                onClick={() => navigate(`/employees/${employee.employeeId}`)}
                            >
                                <TableCell sx={{ color: "primary.main" }}>
                                    {employee.employeeName}
                                </TableCell>
                                <TableCell>{employee.designation}</TableCell>
                                <TableCell align="center">{formatDate(employee.createdAt)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    );
}
