import React from "react";
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

import { ACTION_TYPE_LABELS } from "../constants/hrms";
import ResponsiveTableContainer from "./ResponsiveTableContainer";

const formatDate = (date) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-GB");
};

const getActionColor = (action) => {
    const map = {
        PROMOTION: "success",
        ASSIGNMENT_GRADE_UPDATE: "success",
        TRANSFER_IN: "info",
        TRANSFER_OUT: "warning",
        OFFICE_CHANGE: "info",
        NEW_APPOINTMENT: "success",
        PERMANENT_CONFIRMATION: "secondary",
        RETIREMENT_OR_RESIGNATION: "error",
        DISMISSAL: "error",
        VACATION_OF_POST: "error",
        DEATH: "error"
    };
    return map[action] || "default";
};

const formatActionLabel = (actionType) => {
    return ACTION_TYPE_LABELS[actionType]
        || actionType?.replace(/_/g, " ")
        || "—";
};

export default function RecentMovementsTable({ data, loading }) {
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
                <Typography variant="h6" sx={{ mb: 2 }}>Recent Employee Actions</Typography>
                <Alert severity="info">No recent movements</Alert>
            </Paper>
        );
    }

    return (
        <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 700 }}>
                Recent Employee Actions
            </Typography>
            <ResponsiveTableContainer tableMinWidth={700}>
                <Table>
                    <TableHead>
                        <TableRow sx={{ bgcolor: "#F1F5F9" }}>
                            <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Employee</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Action</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Details</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {data.map((row, index) => (
                            <TableRow key={index} hover>
                                <TableCell>{formatDate(row.actionDate)}</TableCell>
                                <TableCell 
                                    sx={{ cursor: "pointer", color: "primary.main" }}
                                    onClick={() => navigate(`/employees/${row.employeeId}`)}
                                >
                                    {row.employeeName}
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        label={formatActionLabel(row.actionType)}
                                        size="small"
                                        color={getActionColor(row.actionType)}
                                        variant="outlined"
                                    />
                                </TableCell>
                                <TableCell>{row.description}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </ResponsiveTableContainer>
        </Paper>
    );
}
