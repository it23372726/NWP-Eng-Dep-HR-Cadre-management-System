import React from "react";
import { Paper, Alert, Box, Typography, Skeleton, Grid, Card, CardContent } from "@mui/material";
import WarningIcon from "@mui/icons-material/Warning";
import ErrorIcon from "@mui/icons-material/Error";
import InfoIcon from "@mui/icons-material/Info";

const getSeverityConfig = (severity) => {
    const config = {
        "error": { color: "#B42318", icon: ErrorIcon, variant: "error" },
        "warning": { color: "#B45309", icon: WarningIcon, variant: "warning" },
        "info": { color: "#0F2A4A", icon: InfoIcon, variant: "info" }
    };
    return config[severity] || config.info;
};

export default function DashboardAlerts({ alerts, loading }) {
    if (loading) {
        return (
            <Paper sx={{ p: 3, borderRadius: 2 }}>
                <Skeleton variant="text" width="40%" height={32} />
                {[1, 2].map(i => (
                    <Skeleton key={i} variant="rectangular" height={80} sx={{ mt: 2 }} />
                ))}
            </Paper>
        );
    }

    if (!alerts || alerts.length === 0) {
        return (
            <Alert severity="success" sx={{ mb: 3 }}>
                ✓ No critical alerts at this time
            </Alert>
        );
    }

    return (
        <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                Dashboard Alerts
            </Typography>
            <Grid container spacing={2}>
                {alerts.map((alert, index) => {
                    const Icon = getSeverityConfig(alert.severity).icon;
                    return (
                        <Grid item xs={12} sm={6} md={4} key={index}>
                            <Alert 
                                severity={getSeverityConfig(alert.severity).variant}
                                icon={<Icon />}
                                sx={{ height: "100%" }}
                            >
                                <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
                                    {alert.message}
                                </Typography>
                                <Typography variant="h6" sx={{ color: "inherit", fontWeight: 700 }}>
                                    {alert.count}
                                </Typography>
                            </Alert>
                        </Grid>
                    );
                })}
            </Grid>
        </Box>
    );
}
