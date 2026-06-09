import { Paper, Typography, Box, Skeleton, Alert } from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";

const SERVICE_COLORS = {
    "SLEGS": "#1E3A8A",
    "SLACS": "#2563EB",
    "SLTS": "#0F766E",
    "PPMAS": "#059669",
    "DEPT": "#D97706"
};

const getServiceColor = (serviceCode) => {
    return SERVICE_COLORS[serviceCode] || "#0F2A4A";
};

export default function ServiceDistributionChart({ data, loading }) {
    if (loading) {
        return (
            <Paper sx={{ p: 3, borderRadius: 2 }}>
                <Skeleton variant="text" width="40%" height={32} />
                <Skeleton variant="rectangular" height={300} sx={{ mt: 2 }} />
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

    // Transform data with colors for each bar
    const series = [{
        dataKey: "count",
        label: "Employees",
        valueFormatter: (value) => `${value} employees`
    }];

    const colors = data.map(item => getServiceColor(item.category));

    return (
        <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 700 }}>
                Employees by Service
            </Typography>
            <Box sx={{ width: "100%", height: 300 }}>
                <BarChart
                    dataset={data}
                    xAxis={[{ scaleType: "band", dataKey: "category" }]}
                    series={series}
                    margin={{ top: 20, right: 30, left: 40, bottom: 80 }}
                    slotProps={{
                        legend: { hidden: false }
                    }}
                    colors={colors}
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
