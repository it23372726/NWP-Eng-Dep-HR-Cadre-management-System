import {
    Paper,
    Typography,
    Box,
    Skeleton,
    Stack,
    Chip,
    LinearProgress
} from "@mui/material";
import EventIcon from "@mui/icons-material/Event";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import TimelineIcon from "@mui/icons-material/Timeline";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { useNavigate } from "react-router-dom";
import { buildEmployeeListUrl } from "../utils/dashboardNavigation";
import { KPI_COLORS } from "../constants/dashboardTheme";

const RETIREMENT_AGE = 60;

const ForecastHorizon = ({
    step,
    title,
    description,
    urgencyLabel,
    count,
    color,
    icon: Icon,
    loading,
    maxCount,
    onClick
}) => {
    const progress = maxCount > 0 ? Math.min(100, ((count ?? 0) / maxCount) * 100) : 0;

    return (
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


                    spacing={1.5}
                    sx={{alignItems: { xs: "flex-start", sm: "center" }, justifyContent: "space-between",  mb: 1.5 }}
                >
                    <Stack direction="row" spacing={1.5} sx={{alignItems: "flex-start",  flex: 1 }}>
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
                            <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: "center", flexWrap: "wrap" }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                    {title}
                                </Typography>
                                <Chip
                                    label={urgencyLabel}
                                    size="small"
                                    sx={{
                                        height: 20,
                                        fontSize: "0.65rem",
                                        fontWeight: 700,
                                        bgcolor: `${color}14`,
                                        color,
                                        border: `1px solid ${color}44`
                                    }}
                                />
                            </Stack>
                            <Typography variant="caption" color="text.secondary">
                                {description}
                            </Typography>
                        </Box>
                    </Stack>

                    <Stack
                        direction="row"

                        spacing={1.5}
                        sx={{alignItems: "center",  flexShrink: 0, alignSelf: { xs: "flex-end", sm: "center" } }}
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

                {!loading && (
                    <LinearProgress
                        variant="determinate"
                        value={progress}
                        sx={{
                            height: 6,
                            borderRadius: 3,
                            bgcolor: `${color}12`,
                            "& .MuiLinearProgress-bar": {
                                borderRadius: 3,
                                bgcolor: color
                            }
                        }}
                    />
                )}
            </Box>
        </Box>
    );
};

export default function RetirementForecastCard({ data, loading }) {
    const navigate = useNavigate();

    const maxCount = Math.max(
        data?.retiringThisYear ?? 0,
        data?.retiringWithinTwoYears ?? 0,
        data?.retiringWithinFiveYears ?? 0,
        1
    );

    const horizons = [
        {
            step: "1",
            title: "Retiring This Year",
            description: "Expected retirement within the current calendar year",
            urgencyLabel: "Immediate",
            count: data?.retiringThisYear,
            color: "#B42318",
            icon: WarningAmberIcon,
            months: 12
        },
        {
            step: "2",
            title: "Next 2 Years",
            description: "Retiring within the next 24 months",
            urgencyLabel: "Near-term",
            count: data?.retiringWithinTwoYears,
            color: "#B45309",
            icon: CalendarMonthIcon,
            months: 24
        },
        {
            step: "3",
            title: "Next 5 Years",
            description: "Retiring within the next 60 months — workforce planning",
            urgencyLabel: "Planning",
            count: data?.retiringWithinFiveYears,
            color: KPI_COLORS.retirement,
            icon: TimelineIcon,
            months: 60
        }
    ];

    return (
        <Paper sx={{ p: 3, borderRadius: 2, height: "100%" }}>
            <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Retirement Forecast
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Projected retirements based on age {RETIREMENT_AGE} for workforce planning
                </Typography>
            </Box>

            <Box sx={{ mb: 2 }}>
                {horizons.map((horizon) => (
                    <ForecastHorizon
                        key={horizon.step}
                        {...horizon}
                        loading={loading}
                        maxCount={maxCount}
                        onClick={() => navigate(buildEmployeeListUrl({
                            retiringWithin: horizon.months
                        }))}
                    />
                ))}
            </Box>

            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    p: 1.5,
                    borderRadius: 1.5,
                    bgcolor: "#F8FAFC",
                    border: "1px solid",
                    borderColor: "divider"
                }}
            >
                <EventIcon sx={{ color: "text.secondary", fontSize: 18 }} />
                <Typography variant="caption" color="text.secondary">
                    Bars show relative volume across horizons. Select a period to review affected employees.
                </Typography>
            </Box>
        </Paper>
    );
}
