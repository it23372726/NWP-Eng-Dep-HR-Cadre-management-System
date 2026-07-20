import { useMemo } from "react";
import { Paper, Typography, Box, Skeleton, Alert } from "@mui/material";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from "recharts";
import {
    CHART_HEIGHT,
    GRADE_NAMED_COLORS,
    buildChartColorMap
} from "../constants/dashboardTheme";

export default function GradeDistributionChart({ data, loading }) {
    const colorMap = useMemo(
        () => buildChartColorMap(
            (data || []).map((item) => item.category),
            GRADE_NAMED_COLORS
        ),
        [data]
    );

    if (loading) {
        return (
            <Paper sx={{ p: 3, borderRadius: 2 }}>
                <Skeleton variant="text" width="40%" height={32} />
                <Skeleton variant="rectangular" height={CHART_HEIGHT} sx={{ mt: 2 }} />
            </Paper>
        );
    }

    if (!data || data.length === 0) {
        return (
            <Paper sx={{ p: 3, borderRadius: 2 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Grade Distribution</Typography>
                <Alert severity="info">No grade data available</Alert>
            </Paper>
        );
    }

    return (
        <Paper sx={{ p: 3, borderRadius: 2, height: "100%" }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 700 }}>
                Grade Distribution
            </Typography>
            <Box sx={{ width: "100%", height: CHART_HEIGHT }}>
                <ResponsiveContainer
                    width="100%"
                    height="100%"
                    initialDimension={{ width: 500, height: CHART_HEIGHT }}
                >
                    <BarChart
                        data={data}
                        margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis
                            dataKey="category"
                            tick={{ fontSize: 12, fill: "#64748B" }}
                            interval={0}
                            angle={-25}
                            textAnchor="end"
                            height={70}
                        />
                        <YAxis
                            allowDecimals={false}
                            tick={{ fontSize: 12, fill: "#64748B" }}
                        />
                        <Tooltip
                            formatter={(value) => [`${value} employees`, "Count"]}
                            labelFormatter={(label) => label}
                        />
                        <Bar
                            dataKey="count"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={56}
                        >
                            {data.map((entry) => (
                                <Cell
                                    key={entry.category}
                                    fill={colorMap.get(entry.category)}
                                    stroke="rgba(0,0,0,0.1)"
                                    strokeWidth={1}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </Box>
        </Paper>
    );
}
