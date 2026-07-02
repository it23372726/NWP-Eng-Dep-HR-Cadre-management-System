import {
    Paper,
    Typography,
    Box,
    Skeleton,
    Stack,
    Divider,
    Grid,
    Chip
} from "@mui/material";
import VerifiedIcon from "@mui/icons-material/Verified";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import AutoGraphIcon from "@mui/icons-material/AutoGraph";
import NewReleasesIcon from "@mui/icons-material/NewReleases";
import { useNavigate } from "react-router-dom";
import { buildEmployeeListUrl } from "../utils/dashboardNavigation";
import { KPI_COLORS } from "../constants/dashboardTheme";

const PipelineStage = ({
    step,
    title,
    description,
    count,
    color,
    icon: Icon,
    loading,
    onClick
}) => (
    <Box
        onClick={onClick}
        sx={{
            position: "relative",
            pl: 3,
            pb: 2.5,
            cursor: onClick ? "pointer" : "default",
            "&:last-child": { pb: 0 },
            "&::before": {
                content: '""',
                position: "absolute",
                left: 11,
                top: 28,
                bottom: 0,
                width: 2,
                bgcolor: "divider"
            },
            "&:last-child::before": { display: "none" }
        }}
    >
        <Box
            sx={{
                position: "absolute",
                left: 0,
                top: 4,
                width: 24,
                height: 24,
                borderRadius: "50%",
                bgcolor: `${color}18`,
                border: `2px solid ${color}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1
            }}
        >
            <Typography
                variant="caption"
                sx={{ fontWeight: 700, color, fontSize: "0.65rem", lineHeight: 1 }}
            >
                {step}
            </Typography>
        </Box>

        <Box
            sx={{
                p: 2,
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "background.paper",
                transition: "all 0.2s ease",
                "&:hover": onClick ? {
                    borderColor: color,
                    boxShadow: `0 4px 12px ${color}22`,
                    transform: "translateY(-1px)"
                } : {}
            }}
        >
            <Stack
                direction={{ xs: "column", sm: "row" }}
                alignItems={{ xs: "flex-start", sm: "center" }}
                justifyContent="space-between"
                spacing={1.5}
            >
                <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ flex: 1 }}>
                    <Box
                        sx={{
                            p: 1,
                            borderRadius: 1.5,
                            bgcolor: `${color}14`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0
                        }}
                    >
                        <Icon sx={{ color, fontSize: 22 }} />
                    </Box>
                    <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {description}
                        </Typography>
                    </Box>
                </Stack>

                <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1.5}
                    sx={{ flexShrink: 0, alignSelf: { xs: "flex-end", sm: "center" } }}
                >
                    {loading ? (
                        <Skeleton variant="text" width={48} height={36} />
                    ) : (
                        <Typography variant="h4" sx={{ fontWeight: 700, color, lineHeight: 1 }}>
                            {count ?? 0}
                        </Typography>
                    )}
                    {onClick && !loading && (
                        <Chip
                            icon={<ArrowForwardIcon sx={{ fontSize: "16px !important" }} />}
                            label="View"
                            size="small"
                            sx={{
                                fontWeight: 600,
                                borderColor: color,
                                color,
                                "& .MuiChip-icon": { color }
                            }}
                            variant="outlined"
                        />
                    )}
                </Stack>
            </Stack>
        </Box>
    </Box>
);

const ActivityStat = ({ label, count, icon: Icon, color, loading }) => (
    <Box
        sx={{
            p: 1.5,
            borderRadius: 1.5,
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "#F8FAFC",
            textAlign: "center",
            height: "100%"
        }}
    >
        <Icon sx={{ color, fontSize: 20, mb: 0.5 }} />
        {loading ? (
            <Skeleton variant="text" width="50%" sx={{ mx: "auto" }} />
        ) : (
            <Typography variant="h6" sx={{ fontWeight: 700, color }}>
                {count ?? 0}
            </Typography>
        )}
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
            {label}
        </Typography>
    </Box>
);

export default function PromotionPipelinePanel({ summary, loading }) {
    const navigate = useNavigate();

    const pipelineStages = [
        {
            step: "1",
            title: "Permanent Confirmation",
            description: "Qualified and awaiting confirmation action",
            count: summary?.qualifiedForPermanentEmployees,
            color: KPI_COLORS.permanent,
            icon: VerifiedIcon,
            onClick: () => navigate(buildEmployeeListUrl({
                permanentStatus: "QUALIFIED_FOR_PERMANENT"
            }))
        },
        {
            step: "2",
            title: "Grade III → II",
            description: "Eligible for assignment / grade update",
            count: summary?.eligibleGrade3To2,
            color: KPI_COLORS.grade3to2,
            icon: TrendingUpIcon,
            onClick: () => navigate(buildEmployeeListUrl({
                gradePromotion: "QUALIFIED_GRADE_3_TO_2"
            }))
        },
        {
            step: "3",
            title: "Grade II → I",
            description: "Eligible for assignment / grade update",
            count: summary?.eligibleGrade2To1,
            color: KPI_COLORS.grade2to1,
            icon: TrendingUpIcon,
            onClick: () => navigate(buildEmployeeListUrl({
                gradePromotion: "QUALIFIED_GRADE_2_TO_1"
            }))
        },
        {
            step: "4",
            title: "Grade I → Supra",
            description: "Eligible for Supra promotion",
            count: summary?.eligibleGrade1ToSupra,
            color: KPI_COLORS.gradeSupra,
            icon: TrendingUpIcon,
            onClick: () => navigate(buildEmployeeListUrl({
                gradePromotion: "QUALIFIED_GRADE_1_TO_SUPRA"
            }))
        },
        {
            step: "5",
            title: "Grade I → Special",
            description: "Eligible for Special promotion",
            count: summary?.eligibleGrade1ToSpecial,
            color: KPI_COLORS.gradeSpecial,
            icon: TrendingUpIcon,
            onClick: () => navigate(buildEmployeeListUrl({
                gradePromotion: "QUALIFIED_GRADE_1_TO_SPECIAL"
            }))
        }
    ];

    const activityStats = [
        {
            label: "Recently qualified (30d)",
            count: summary?.recentlyQualified,
            icon: NewReleasesIcon,
            color: "#7C3AED"
        },
        {
            label: "Promotions this year",
            count: summary?.promotionsThisYear,
            icon: AutoGraphIcon,
            color: "#0891B2"
        },
        {
            label: "New appointments this year",
            count: summary?.newAppointmentsThisYear,
            icon: PersonAddIcon,
            color: "#1B7A46"
        }
    ];

    return (
        <Paper sx={{ p: 3, borderRadius: 2, height: "100%" }}>
            <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Promotion Pipeline
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Career progression actions requiring management attention
                </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
                {pipelineStages.map((stage) => (
                    <PipelineStage
                        key={stage.step}
                        {...stage}
                        loading={loading}
                    />
                ))}
            </Box>

            <Divider sx={{ mb: 2 }} />

            <Typography
                variant="overline"
                sx={{
                    fontWeight: 700,
                    color: "text.secondary",
                    letterSpacing: 1,
                    display: "block",
                    mb: 1.5
                }}
            >
                Year-to-date activity
            </Typography>

            <Grid container spacing={1.5}>
                {activityStats.map((stat) => (
                    <Grid item xs={12} sm={4} key={stat.label}>
                        <ActivityStat {...stat} loading={loading} />
                    </Grid>
                ))}
            </Grid>
        </Paper>
    );
}
