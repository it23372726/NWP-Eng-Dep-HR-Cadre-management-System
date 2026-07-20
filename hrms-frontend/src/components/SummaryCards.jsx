import { Paper, Typography, Skeleton, Box } from "@mui/material";
import Grid from "@mui/material/Grid";
import PeopleIcon from "@mui/icons-material/People";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import EventIcon from "@mui/icons-material/Event";

const SummaryCard = ({ icon: Icon, title, value, subtitle, color, loading }) => {
    return (
        <Paper
            sx={{
                p: { xs: 2, sm: 2.5 },
                display: "flex",
                alignItems: "center",
                gap: 2,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                transition: "all 0.3s ease",
                "&:hover": {
                    boxShadow: 3,
                    borderColor: color
                }
            }}
        >
            <Box
                sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: `${color}20`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                }}
            >
                <Icon sx={{ color, fontSize: 32 }} />
            </Box>
            <Box sx={{ flex: 1 }}>
                <Typography variant="body2" color="text.secondary">
                    {title}
                </Typography>
                {loading ? (
                    <>
                        <Skeleton variant="text" width="60%" height={32} sx={{ mt: 1 }} />
                        <Skeleton variant="text" width="40%" height={20} sx={{ mt: 0.5 }} />
                    </>
                ) : (
                    <>
                        <Typography variant="h5" sx={{ fontWeight: 700, mt: 1 }}>
                            {value}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {subtitle}
                        </Typography>
                    </>
                )}
            </Box>
        </Paper>
    );
};

export default function SummaryCards({ summary, loading }) {
    const cards = [
        {
            icon: PeopleIcon,
            title: "Active Employees",
            value: summary?.activeEmployees ?? 0,
            subtitle: "Active status",
            color: "#1B7A46"
        },
        {
            icon: AccountTreeIcon,
            title: "Total Cadre Positions",
            value: summary?.approvedCadre ?? 0,
            subtitle: "Approved positions",
            color: "#0B5394"
        },
        {
            icon: EventIcon,
            title: "Retirement Watch",
            value: summary?.retirementWatch ?? 0,
            subtitle: "Within 24 months",
            color: "#7C3AED"
        },
        {
            icon: EventIcon,
            title: "Recently Qualified",
            value: summary?.recentlyQualified ?? 0,
            subtitle: "Last 30 days",
            color: "#0891B2"
        }
    ];

    return (
        <Grid container spacing={2} sx={{ mb: 4 }}>
            {cards.map((card, index) => (
                <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={index}>
                    <SummaryCard
                        icon={card.icon}
                        title={card.title}
                        value={card.value}
                        subtitle={card.subtitle}
                        color={card.color}
                        loading={loading}
                    />
                </Grid>
            ))}
        </Grid>
    );
}
