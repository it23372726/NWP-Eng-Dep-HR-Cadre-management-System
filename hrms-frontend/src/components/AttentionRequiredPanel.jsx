import {
    Box,
    Paper,
    Typography,
    Skeleton,
    Stack,
    IconButton
} from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useNavigate } from "react-router-dom";
import { buildDashboardAlertUrl } from "../utils/dashboardNavigation";

export default function AttentionRequiredPanel({ alerts, loading }) {
    const navigate = useNavigate();

    if (loading) {
        return (
            <Paper sx={{ p: 3, borderRadius: 2, mb: 4 }}>
                <Skeleton variant="text" width="40%" height={32} />
                {[1, 2, 3].map((i) => (
                    <Skeleton key={i} variant="rectangular" height={56} sx={{ mt: 1.5 }} />
                ))}
            </Paper>
        );
    }

    if (!alerts || alerts.length === 0) {
        return (
            <Paper
                sx={{
                    p: 3,
                    mb: 4,
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: "success.light",
                    bgcolor: "#F0FDF4"
                }}
            >
                <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                    <CheckCircleIcon sx={{ color: "success.main" }} />
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        No items require immediate attention
                    </Typography>
                </Stack>
            </Paper>
        );
    }

    const handleAlertClick = (alert) => {
        const url = buildDashboardAlertUrl(alert);
        if (url) {
            navigate(url);
        }
    };

    return (
        <Paper
            sx={{
                p: 3,
                mb: 4,
                borderRadius: 2,
                border: "1px solid",
                borderColor: "#FECACA",
                borderLeft: "4px solid #B42318",
                bgcolor: "#FEF3F2"
            }}
        >
            <Stack direction="row" spacing={1} sx={{alignItems: "center",  mb: 2 }}>
                <WarningAmberIcon sx={{ color: "#B42318" }} />
                <Typography variant="h6" sx={{ fontWeight: 700, color: "#7F1D1D" }}>
                    Attention Required
                </Typography>
            </Stack>

            <Stack spacing={1}>
                {alerts.map((alert, index) => (
                    <Box
                        key={`${alert.type}-${index}`}
                        onClick={() => handleAlertClick(alert)}
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            p: 1.5,
                            borderRadius: 1.5,
                            bgcolor: "white",
                            border: "1px solid #FECACA",
                            cursor: alert.actionPath ? "pointer" : "default",
                            transition: "all 0.2s ease",
                            "&:hover": alert.actionPath ? {
                                bgcolor: "#FFF5F5",
                                borderColor: "#F87171"
                            } : {}
                        }}
                    >
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                            <WarningAmberIcon
                                sx={{
                                    color: alert.severity === "error" ? "#B42318" : "#B45309",
                                    fontSize: 20
                                }}
                            />
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {alert.count} — {alert.message}
                            </Typography>
                        </Stack>
                        {alert.actionPath && (
                            <IconButton size="small" sx={{ color: "#B42318" }}>
                                <ChevronRightIcon />
                            </IconButton>
                        )}
                    </Box>
                ))}
            </Stack>
        </Paper>
    );
}
