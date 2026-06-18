import { Box, Typography } from "@mui/material";

export default function DashboardSection({ title, description, children, sx }) {
    return (
        <Box sx={{ mb: 4, ...sx }}>
            <Box sx={{ mb: 2.5 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {title}
                </Typography>
                {description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {description}
                    </Typography>
                )}
            </Box>
            {children}
        </Box>
    );
}

export const dashboardGrid = {
    twoCol: {
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
        gap: 3
    },
    threeCol: {
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "1fr 1fr", lg: "1fr 1fr 1fr" },
        gap: 3
    }
};
