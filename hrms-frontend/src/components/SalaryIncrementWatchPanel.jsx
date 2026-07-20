import {
    Box,
    Chip,
    List,
    ListItem,
    ListItemText,
    Paper,
    Skeleton,
    Stack,
    Typography
} from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import ScheduleIcon from "@mui/icons-material/Schedule";
import { useNavigate } from "react-router-dom";
import { formatSalaryIncrementDate, getOverdueLabel } from "../utils/salaryIncrement";

function IncrementList({ title, items, emptyMessage, icon, tone }) {
    const navigate = useNavigate();

    return (
        <Paper
            sx={{
                p: 3,
                borderRadius: 2,
                height: "100%",
                border: "1px solid",
                borderColor: tone.border,
                bgcolor: tone.bg
            }}
        >
            <Stack direction="row" spacing={1} sx={{alignItems: "center",  mb: 2 }}>
                {icon}
                <Typography variant="h6" sx={{ fontWeight: 700, color: tone.title }}>
                    {title}
                </Typography>
                {items?.length > 0 && (
                    <Chip
                        size="small"
                        label={items.length}
                        sx={{ bgcolor: tone.chipBg, color: tone.chipColor, fontWeight: 700 }}
                    />
                )}
            </Stack>

            {!items || items.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                    {emptyMessage}
                </Typography>
            ) : (
                <List dense disablePadding>
                    {items.map((item) => (
                        <ListItem
                            key={item.employeeId}
                            disableGutters
                            sx={{
                                cursor: "pointer",
                                borderRadius: 1,
                                px: 1,
                                "&:hover": { bgcolor: "rgba(0,0,0,0.04)" }
                            }}
                            onClick={() => navigate(`/employees/${item.employeeId}`)}
                        >
                            <ListItemText
                                primary={(
                                    <Stack
                                        direction="row"
                                        spacing={1}


                                        useFlexGap
                                     sx={{ alignItems: "center", flexWrap: "wrap" }}>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                            {item.employeeName}
                                        </Typography>
                                        {item.overdueYears > 0 && (
                                            <Chip
                                                size="small"
                                                color="warning"
                                                label={getOverdueLabel(item.overdueYears)}
                                            />
                                        )}
                                    </Stack>
                                )}
                                secondary={`${item.designation} · Due ${formatSalaryIncrementDate(item.dueDate)}`}
                            />
                        </ListItem>
                    ))}
                </List>
            )}
        </Paper>
    );
}

export default function SalaryIncrementWatchPanel({
    pending = [],
    upcoming = [],
    loading = false
}) {
    if (loading) {
        return (
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3 }}>
                <Skeleton variant="rectangular" height={240} sx={{ borderRadius: 2 }} />
                <Skeleton variant="rectangular" height={240} sx={{ borderRadius: 2 }} />
            </Box>
        );
    }

    if ((!pending || pending.length === 0) && (!upcoming || upcoming.length === 0)) {
        return null;
    }

    return (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3 }}>
            <IncrementList
                title="Pending Increments"
                items={pending}
                emptyMessage="No pending salary increments"
                icon={<TrendingUpIcon sx={{ color: "#B45309" }} />}
                tone={{
                    border: "#FCD34D",
                    bg: "#FFFBEB",
                    title: "#92400E",
                    chipBg: "#FDE68A",
                    chipColor: "#92400E"
                }}
            />
            <IncrementList
                title="Upcoming Increments"
                items={upcoming}
                emptyMessage="No increments due in the next 30 days"
                icon={<ScheduleIcon sx={{ color: "#1D4ED8" }} />}
                tone={{
                    border: "#BFDBFE",
                    bg: "#EFF6FF",
                    title: "#1E3A8A",
                    chipBg: "#DBEAFE",
                    chipColor: "#1E3A8A"
                }}
            />
        </Box>
    );
}
