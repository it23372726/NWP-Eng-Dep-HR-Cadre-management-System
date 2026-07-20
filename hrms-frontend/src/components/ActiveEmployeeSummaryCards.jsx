import { Box, Paper, Skeleton, Typography } from "@mui/material";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import VerifiedIcon from "@mui/icons-material/Verified";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import EventIcon from "@mui/icons-material/Event";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { KPI_COLORS } from "../constants/dashboardTheme";

function SummaryCard({
    icon: Icon,
    title,
    value,
    subtitle,
    color,
    loading,
    onClick,
    active
}) {
    return (
        <Paper
            onClick={onClick}
            sx={{
                p: 2,
                display: "flex",
                alignItems: "flex-start",
                gap: 1.5,
                border: "1px solid",
                borderColor: active ? color : "divider",
                borderRadius: 2,
                cursor: onClick ? "pointer" : "default",
                height: "100%",
                bgcolor: active ? `${color}08` : "background.paper",
                transition: "all 0.2s ease",
                "&:hover": onClick ? {
                    borderColor: color,
                    boxShadow: 2
                } : {}
            }}
        >
            <Box
                sx={{
                    p: 1,
                    borderRadius: 1.5,
                    bgcolor: `${color}18`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0
                }}
            >
                <Icon sx={{ color, fontSize: 22 }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" color="text.secondary" noWrap>
                    {title}
                </Typography>
                {loading ? (
                    <>
                        <Skeleton variant="text" width="50%" height={32} sx={{ mt: 0.5 }} />
                        <Skeleton variant="text" width="70%" height={16} />
                    </>
                ) : (
                    <>
                        <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.2, mt: 0.25 }}>
                            {value}
                        </Typography>
                        {subtitle && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                                {subtitle}
                            </Typography>
                        )}
                    </>
                )}
            </Box>
        </Paper>
    );
}

export default function ActiveEmployeeSummaryCards({
    stats,
    loading,
    onFilterShortcut,
    activeShortcut,
    variant = "default"
}) {
    const cards = variant === "pending"
        ? [
            {
                key: "total",
                icon: PeopleAltIcon,
                title: "System Pending",
                value: stats?.total ?? 0,
                subtitle: "Profiles awaiting career history",
                color: KPI_COLORS.active
            }
        ]
        : [
        {
            key: "total",
            icon: PeopleAltIcon,
            title: "Total Active",
            value: stats?.total ?? 0,
            subtitle: "In current scope",
            color: KPI_COLORS.active
        },
        {
            key: "probation",
            icon: HourglassEmptyIcon,
            title: "On Probation",
            value: stats?.probation ?? 0,
            subtitle: "Awaiting confirmation",
            color: "#F59E0B",
            filter: { permanentStatusFilter: "PROBATION" }
        },
        {
            key: "qualified",
            icon: VerifiedIcon,
            title: "Qualified to permanent",
            value: stats?.qualifiedForPermanent ?? 0,
            subtitle: "Ready for permanent",
            color: KPI_COLORS.permanent,
            filter: { permanentStatusFilter: "QUALIFIED_FOR_PERMANENT" }
        },
        {
            key: "confirmed",
            icon: CheckCircleIcon,
            title: "Confirmed",
            value: stats?.confirmedPermanent ?? 0,
            subtitle: "Permanent status",
            color: "#1B7A46",
            filter: { permanentStatusFilter: "PERMANENT" }
        },
        {
            key: "promotion",
            icon: TrendingUpIcon,
            title: "Promotion Ready",
            value: stats?.gradePromotionReady ?? 0,
            subtitle: "Grade III→II or II→I",
            color: KPI_COLORS.grade3to2,
            filter: { gradePromotionFilter: "QUALIFIED_GRADE_3_TO_2" }
        },
        {
            key: "retirement",
            icon: EventIcon,
            title: "Near Retirement",
            value: stats?.nearRetirement ?? 0,
            subtitle: "Within 24 months",
            color: KPI_COLORS.retirement,
            filter: { retiringWithinMonths: "24" }
        }
    ];

    return (
        <Box
            sx={{
                display: "grid",
                gridTemplateColumns: {
                    xs: "1fr 1fr",
                    sm: "repeat(3, 1fr)",
                    lg: "repeat(6, 1fr)"
                },
                gap: 1.5,
                mb: 3
            }}
        >
            {cards.map((card) => (
                <SummaryCard
                    key={card.key}
                    icon={card.icon}
                    title={card.title}
                    value={card.value}
                    subtitle={card.subtitle}
                    color={card.color}
                    loading={loading}
                    active={activeShortcut === card.key}
                    onClick={
                        card.filter && onFilterShortcut
                            ? () => onFilterShortcut(card.key, card.filter)
                            : undefined
                    }
                />
            ))}
        </Box>
    );
}
