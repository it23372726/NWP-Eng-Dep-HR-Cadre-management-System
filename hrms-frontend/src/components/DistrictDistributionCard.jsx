import { Paper, Typography, Grid, Card, CardContent, Skeleton, Alert, Box } from "@mui/material";
import LocationOnIcon from "@mui/icons-material/LocationOn";

const DISTRICT_COLORS = {
    "Kurunegala": "#1E40AF",
    "Puttalam": "#0F766E"
};

const getDistrictColor = (district) => {
    return DISTRICT_COLORS[district] || "#0F2A4A";
};

export default function DistrictDistributionCard({ data, loading }) {
    if (loading) {
        return (
            <Paper sx={{ p: 3, borderRadius: 2 }}>
                <Skeleton variant="text" width="40%" height={32} />
                <Grid container spacing={2} sx={{ mt: 1 }}>
                    {[1, 2].map(i => (
                        <Grid size={{ xs: 12, sm: 6 }} key={i}>
                            <Skeleton variant="rectangular" height={80} />
                        </Grid>
                    ))}
                </Grid>
            </Paper>
        );
    }

    if (!data || data.length === 0) {
        return (
            <Paper sx={{ p: 3, borderRadius: 2 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>District Distribution</Typography>
                <Alert severity="info">No district data available</Alert>
            </Paper>
        );
    }

    return (
        <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 700 }}>
                Employees by District
            </Typography>
            <Grid container spacing={2}>
                {data.map((district, index) => {
                    const color = getDistrictColor(district.district);
                    return (
                        <Grid size={{ xs: 12, sm: 6 }} key={index}>
                            <Card 
                                sx={{ 
                                    border: "1px solid",
                                    borderColor: "divider",
                                    transition: "all 0.3s ease",
                                    "&:hover": {
                                        boxShadow: 2,
                                        borderColor: color
                                    }
                                }}
                            >
                                <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                                    <Box
                                        sx={{
                                            p: 1,
                                            borderRadius: 1,
                                            bgcolor: `${color}20`,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center"
                                        }}
                                    >
                                        <LocationOnIcon sx={{ color, fontSize: 28 }} />
                                    </Box>
                                    <div>
                                        <Typography variant="body2" color="text.secondary">
                                            {district.district}
                                        </Typography>
                                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                            {district.employeeCount}
                                        </Typography>
                                    </div>
                                </CardContent>
                            </Card>
                        </Grid>
                    );
                })}
            </Grid>
        </Paper>
    );
}
