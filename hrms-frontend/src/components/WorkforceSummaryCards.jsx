import { Paper, Typography, Skeleton, Box } from "@mui/material";
import Grid from "@mui/material/Grid";
import PeopleIcon from "@mui/icons-material/People";
import WorkOffIcon from "@mui/icons-material/WorkOff";
import EventIcon from "@mui/icons-material/Event";
import VerifiedIcon from "@mui/icons-material/Verified";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import { useNavigate } from "react-router-dom";
import { KPI_COLORS } from "../constants/dashboardTheme";
import { buildEmployeeListUrl, buildVacancyReportUrl } from "../utils/dashboardNavigation";

const SummaryCard = ({ icon: Icon, title, value, subtitle, color, loading, onClick }) => {
    return (
        <Paper
            onClick={onClick}
            sx={{
                p: 3,
                display: "flex",
                alignItems: "center",
                gap: 2,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                cursor: onClick ? "pointer" : "default",
                transition: "all 0.3s ease",
                height: "100%",
                "&:hover": onClick ? {
                    boxShadow: 3,
                    borderColor: color
                } : {}
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

export default function WorkforceSummaryCards({ summary, loading }) {
    const navigate = useNavigate();

    const cards = [
        {
            icon: PeopleIcon,
            title: "Active Employees",
            value: summary?.activeEmployees ?? 0,
            subtitle: "NWP Engineering",
            color: KPI_COLORS.active,
            onClick: () => navigate(buildEmployeeListUrl())
        },
        {
            icon: WorkOffIcon,
            title: "Vacancies",
            value: summary?.vacancies ?? 0,
            subtitle: "Approved − filled",
            color: KPI_COLORS.vacancy,
            onClick: () => navigate(buildVacancyReportUrl())
        },
        {
            icon: EventIcon,
            title: "Near Retirement",
            value: summary?.retirementWatch ?? 0,
            subtitle: "Within 24 months",
            color: KPI_COLORS.retirement,
            onClick: () => navigate(buildEmployeeListUrl({ retiringWithin: 24 }))
        },
        {
            icon: VerifiedIcon,
            title: "Qualified for Permanent",
            value: summary?.qualifiedForPermanentEmployees ?? 0,
            subtitle: "Action pending",
            color: KPI_COLORS.permanent,
            onClick: () => navigate(buildEmployeeListUrl({
                permanentStatus: "QUALIFIED_FOR_PERMANENT"
            }))
        },
        {
            icon: TrendingUpIcon,
            title: "Qualified Grade III → II",
            value: summary?.eligibleGrade3To2 ?? 0,
            subtitle: "Assignment update",
            color: KPI_COLORS.grade3to2,
            onClick: () => navigate(buildEmployeeListUrl({
                gradePromotion: "QUALIFIED_GRADE_3_TO_2"
            }))
        },
        {
            icon: TrendingUpIcon,
            title: "Qualified Grade II → I",
            value: summary?.eligibleGrade2To1 ?? 0,
            subtitle: "Assignment update",
            color: KPI_COLORS.grade2to1,
            onClick: () => navigate(buildEmployeeListUrl({
                gradePromotion: "QUALIFIED_GRADE_2_TO_1"
            }))
        }
    ];

    return (
        <Grid container spacing={2} sx={{ mb: 4 }}>
            {cards.map((card, index) => (
                <Grid item xs={12} sm={6} md={4} lg={2} key={index}>
                    <SummaryCard
                        icon={card.icon}
                        title={card.title}
                        value={card.value}
                        subtitle={card.subtitle}
                        color={card.color}
                        loading={loading}
                        onClick={card.onClick}
                    />
                </Grid>
            ))}
        </Grid>
    );
}
