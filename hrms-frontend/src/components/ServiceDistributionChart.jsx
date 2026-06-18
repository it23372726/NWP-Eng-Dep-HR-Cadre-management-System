import { Paper, Typography, Box, Skeleton, Alert } from "@mui/material";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { CHART_HEIGHT, getServiceColor } from "../constants/dashboardTheme";

const renderLegend = (props) => {
    const { payload } = props;
    if (!payload?.length) {
        return null;
    }

    return (
        <Box
            component="ul"
            sx={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
                gap: 1.5,
                listStyle: "none",
                m: 0,
                p: 0,
                mt: 1
            }}
        >
            {payload.map((entry, index) => (
                <Box
                    component="li"
                    key={`legend-${index}`}
                    sx={{ display: "flex", alignItems: "center", gap: 0.75 }}
                >
                    <Box
                        sx={{
                            width: 12,
                            height: 12,
                            borderRadius: "50%",
                            bgcolor: entry.color,
                            flexShrink: 0
                        }}
                    />
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                        {entry.value}
                    </Typography>
                </Box>
            ))}
        </Box>
    );
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
    return `${entry.category}\n${entry.count} (${percentage}%)`;
};

export default function ServiceDistributionChart({ data, loading }) {
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
                <Typography variant="h6" sx={{ mb: 2 }}>Employees by Service</Typography>
                <Alert severity="info">No service data available</Alert>
            </Paper>
        );
    }

    const totalEmployees = data.reduce((sum, item) => sum + (item.count || 0), 0);

    if (totalEmployees === 0) {
        return (
            <Paper sx={{ p: 3, borderRadius: 2 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Employees by Service</Typography>
                <Alert severity="info">No service data available</Alert>
            </Paper>
        );
    }

    const chartData = data.map((item, index) => ({
        category: item.category,
        count: item.count,
        fill: getServiceColor(item.category, index)
    }));

    return (
        <Paper sx={{ p: 3, borderRadius: 2, height: "100%" }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 700 }}>
                Employees by Service
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
                            innerRadius={48}
                            paddingAngle={2}
                            stroke="#fff"
                            strokeWidth={2}
                            label={(entry) => renderLabel(entry, totalEmployees)}
                            labelLine
                        >
                            {chartData.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.fill}
                                />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip totalEmployees={totalEmployees} />} />
                        <Legend content={renderLegend} />
                    </PieChart>
                </ResponsiveContainer>
            </Box>
        </Paper>
    );
}
