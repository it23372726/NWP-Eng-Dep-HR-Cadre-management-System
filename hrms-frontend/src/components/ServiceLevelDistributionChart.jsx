import { Paper, Typography, Box, Skeleton, Alert } from "@mui/material";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

const SERVICE_LEVEL_COLORS = {
    "Primary": "#2563EB",
    "Secondary": "#059669",
    "Senior": "#D97706",
    "Tertiary": "#7C3AED"
};

const getServiceLevelColor = (level) => {
    return SERVICE_LEVEL_COLORS[level] || "#0F2A4A";
};

// Custom tooltip with percentage - moved outside component to prevent recreation
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
                    {data.serviceLevel}
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

// Custom label with count and percentage - moved outside component to prevent recreation
const renderLabel = (entry, totalEmployees) => {
    const percentage = ((entry.count / totalEmployees) * 100).toFixed(1);
    return `${entry.serviceLevel}\n${entry.count} (${percentage}%)`;
};

export default function ServiceLevelDistributionChart({ data, loading }) {
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
                <Typography variant="h6" sx={{ mb: 2 }}>Service Level Distribution</Typography>
                <Alert severity="info">No service level data available</Alert>
            </Paper>
        );
    }

    // Calculate total employees for percentage calculation
    const totalEmployees = data.reduce((sum, item) => sum + (item.count || 0), 0);

    // Validate total
    if (totalEmployees === 0) {
        return (
            <Paper sx={{ p: 3, borderRadius: 2 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Service Level Distribution</Typography>
                <Alert severity="info">No service level data available</Alert>
            </Paper>
        );
    }

    // Transform data for Recharts - use actual employee counts
    const chartData = data.map((item) => ({
        serviceLevel: item.category,
        count: item.count
    }));


    return (
        <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 700 }}>
                Employees by Service Level
            </Typography>
            <Box sx={{ width: "100%", height: 350 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            dataKey="count"
                            nameKey="serviceLevel"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            label={(entry) => renderLabel(entry, totalEmployees)}
                            labelLine={true}
                        >
                            {chartData.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={getServiceLevelColor(entry.serviceLevel)}
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
