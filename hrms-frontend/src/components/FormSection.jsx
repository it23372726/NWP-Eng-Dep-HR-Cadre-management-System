import { Box, Paper, Typography } from "@mui/material";

export default function FormSection({ title, description, children }) {
    return (
        <Paper
            variant="outlined"
            sx={{
                p: 2.5,
                mb: 2,
                borderRadius: 2,
                bgcolor: "background.paper"
            }}
        >
            <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={600}>
                    {title}
                </Typography>
                {description && (
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 0.5 }}
                    >
                        {description}
                    </Typography>
                )}
            </Box>

            {children}
        </Paper>
    );
}
