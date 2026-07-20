import { useNavigate } from "react-router-dom";
import {
    Paper,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Typography,
    Skeleton,
    Alert,
    Chip
} from "@mui/material";

import ResponsiveTableContainer from "./ResponsiveTableContainer";

const formatDate = (date) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-GB");
};

const getMonthColor = (months) => {
    if (months > 12) return "#1B7A46";
    if (months > 6) return "#B45309";
    return "#B42318";
};

export default function RetirementWatchListTable({ data, loading }) {
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
                <Typography variant="h6" sx={{ mb: 2 }}>Retirement Watch List</Typography>
                <Alert severity="success">No employees retiring soon</Alert>
            </Paper>
        );
    }

    return (
        <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 700 }}>
                Employees Retiring Within 24 Months
            </Typography>
            <ResponsiveTableContainer tableMinWidth={800}>
                <Table>
                    <TableHead>
                        <TableRow sx={{ bgcolor: "#F1F5F9" }}>
                            <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Designation</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Date of Birth</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700 }}>Expected Retirement Date</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700 }}>Months Remaining</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {data.map((row, index) => (
                            <TableRow key={index} hover sx={{ bgcolor: row.remainingMonths <= 6 ? "#FFF3E0" : "transparent" }}>
                                <TableCell
                                    sx={{ cursor: "pointer", color: "primary.main" }}
                                    onClick={() => navigate(`/employees/${row.employeeId}`)}
                                >
                                    {row.employeeName}
                                </TableCell>
                                <TableCell>{row.designation}</TableCell>
                                <TableCell>{formatDate(row.dateOfBirth)}</TableCell>
                                <TableCell align="center">{formatDate(row.retirementDate)}</TableCell>
                                <TableCell align="center">
                                    <Chip
                                        label={row.remainingMonths}
                                        size="small"
                                        sx={{
                                            bgcolor: getMonthColor(row.remainingMonths),
                                            color: "white",
                                            fontWeight: 700
                                        }}
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </ResponsiveTableContainer>
        </Paper>
    );
}
