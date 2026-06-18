import { useMemo } from "react";
import { Paper, Typography, Skeleton, Alert } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { BAR_CHART_PREVIEW_HEIGHT } from "../constants/dashboardTheme";
import { buildEmployeeListUrl } from "../utils/dashboardNavigation";
import ExpandableVerticalBarChart from "./ExpandableVerticalBarChart";

export default function DesignationDistributionChart({ data, loading }) {
    const navigate = useNavigate();

    const chartData = useMemo(
        () => (data || []).map((item) => ({
            name: item.category,
            count: item.count
        })),
        [data]
    );

    if (loading) {
        return (
            <Paper sx={{ p: 3, borderRadius: 2 }}>
                <Skeleton variant="text" width="40%" height={32} />
                <Skeleton variant="rectangular" height={BAR_CHART_PREVIEW_HEIGHT} sx={{ mt: 2 }} />
            </Paper>
        );
    }

    if (!chartData.length) {
        return (
            <Paper sx={{ p: 3, borderRadius: 2 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Employees by Designation</Typography>
                <Alert severity="info">No designation data available</Alert>
            </Paper>
        );
    }

    const handleBarClick = (entry) => {
        if (entry?.name) {
            navigate(buildEmployeeListUrl({ search: entry.name }));
        }
    };

    return (
        <Paper sx={{ p: 3, borderRadius: 2, height: "100%" }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 700 }}>
                Employees by Designation
            </Typography>
            <ExpandableVerticalBarChart
                data={chartData}
                chartKey="designation"
                preset="designation"
                dialogTitle="Employees by Designation"
                onBarClick={handleBarClick}
            />
        </Paper>
    );
}
