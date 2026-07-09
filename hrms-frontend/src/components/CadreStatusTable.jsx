import React, { useState } from "react";
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
    Chip,
    TextField,
    Box
} from "@mui/material";

import ResponsiveTableContainer from "./ResponsiveTableContainer";

export default function CadreStatusTable({ data, loading }) {
    const [searchTerm, setSearchTerm] = useState("");

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
                <Typography variant="h6" sx={{ mb: 2 }}>Cadre Status Overview</Typography>
                <Alert severity="info">No cadre data available</Alert>
            </Paper>
        );
    }

    const getVacancyColor = (status) => {
        if (status === "green") return "#1B7A46";
        if (status === "orange") return "#B45309";
        return "#B42318";
    };

    const filtered = data.filter(item =>
        item.designation.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                Cadre Status Overview
            </Typography>
            <TextField
                placeholder="Search designation..."
                size="small"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ mb: 2 }}
            />
            <ResponsiveTableContainer tableMinWidth={600}>
                <Table>
                    <TableHead>
                        <TableRow sx={{ bgcolor: "#F1F5F9" }}>
                            <TableCell sx={{ fontWeight: 700 }}>Designation</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700 }}>Approved</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700 }}>Existing</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700 }}>Vacancy</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filtered.map((row, index) => (
                            <TableRow key={index} hover>
                                <TableCell>{row.designation}</TableCell>
                                <TableCell align="center">{row.approved}</TableCell>
                                <TableCell align="center">{row.existing}</TableCell>
                                <TableCell align="center">
                                    <Chip
                                        label={row.vacancy}
                                        size="small"
                                        sx={{
                                            bgcolor: getVacancyColor(row.vacancyStatus),
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
