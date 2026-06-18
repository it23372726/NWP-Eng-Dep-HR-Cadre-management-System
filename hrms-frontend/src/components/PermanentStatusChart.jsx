import { Paper, Typography, Box, Skeleton, Alert } from "@mui/material";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useNavigate } from "react-router-dom";
import {
    CHART_HEIGHT,
    getPermanentStatusColor
} from "../constants/dashboardTheme";
import { buildEmployeeListUrl } from "../utils/dashboardNavigation";

const STATUS_TO_FILTER = {
    Probation: "PROBATION",
    "Qualified for Permanent": "QUALIFIED_FOR_PERMANENT",
    "Confirmed Permanent": "PERMANENT"
};

const CustomTooltip = ({ active, payload, totalEmployees }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const percentage = ((data.count / totalEmployees) * 100).toFixed(1);
        return (
            <Box
                sx={{
                    backgroundColor: "white",
                    padding: 2,
                    border: "1px solid #ccc",
                    borderRadius: 1,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                }}
            >
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {data.category}
                </Typography>
                <Typography variant="body2">
                    Employees: {data.count}
                </Typography>
                <Typography variant="body2">
                    Percentage: {percentage}%
                </Typography>
            </Box>
        );
    }
    return null;
};

const renderLabel = (entry, totalEmployees) => {
    const percentage = ((entry.count / totalEmployees) * 100).toFixed(1);
    return `${entry.count} (${percentage}%)`;
};

export default function PermanentStatusChart({ data, loading }) {
    const navigate = useNavigate();

    if (loading) {
        return (
            <Paper sx={{ p: 3, borderRadius: 2 }}>
                <Skeleton variant="text" width="40%" height={32} />
                <Skeleton variant="circular" width={250} height={250} sx={{ mx: "auto", mt: 2 }} />
            </Paper>
        );
    }

    if (!data || data.length === 0) {
        return (
            <Paper sx={{ p: 3, borderRadius: 2 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Permanent Status Overview</Typography>
                <Alert severity="info">No permanent status data available</Alert>
            </Paper>
        );
    }

    const totalEmployees = data.reduce((sum, item) => sum + (item.count || 0), 0);

    const chartData = data.map((item) => ({
        category: item.category,
        count: item.count
    }));

    const handleSliceClick = (entry) => {
        const filter = STATUS_TO_FILTER[entry.category];
        if (filter) {
            navigate(buildEmployeeListUrl({ permanentStatus: filter }));
        }
    };

    return (
        <Paper sx={{ p: 3, borderRadius: 2, height: "100%" }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 700 }}>
                Permanent Status Overview
            </Typography>
            <Box sx={{ width: "100%", height: CHART_HEIGHT }}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            dataKey="count"
                            nameKey="category"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            label={(entry) => renderLabel(entry, totalEmployees)}
                            labelLine
                            onClick={handleSliceClick}
                            style={{ cursor: "pointer" }}
                        >
                            {chartData.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={getPermanentStatusColor(entry.category)}
                                />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip totalEmployees={totalEmployees} />} />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </Box>
        </Paper>
    );
}
