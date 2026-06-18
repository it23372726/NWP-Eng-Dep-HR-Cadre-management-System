import { Paper, Typography, Box, Skeleton, Alert } from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";
import { CHART_HEIGHT, getGradeColor } from "../constants/dashboardTheme";

export default function GradeDistributionChart({ data, loading }) {
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

    const colors = data.map((_, index) => getGradeColor(index));

    return (
        <Paper sx={{ p: 3, borderRadius: 2, height: "100%" }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 700 }}>
                Grade Distribution
            </Typography>
            <Box sx={{ width: "100%", height: CHART_HEIGHT }}>
                <BarChart
                    dataset={data}
                    xAxis={[{ scaleType: "band", dataKey: "category" }]}
                    series={[{
                        dataKey: "count",
                        label: "Employees",
                        valueFormatter: (value) => `${value} employees`
                    }]}
                    margin={{ top: 20, right: 30, left: 40, bottom: 80 }}
                    colors={colors}
                    height={CHART_HEIGHT}
                    sx={{
                        "& .MuiBarElement-root": {
                            strokeWidth: 1,
                            stroke: "rgba(0,0,0,0.1)"
                        }
                    }}
                />
            </Box>
        </Paper>
    );
}
