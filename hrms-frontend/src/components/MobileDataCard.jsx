import { Box, Paper, Stack, Typography } from "@mui/material";

export function MobileDataCardList({ children, sx }) {
    return (
        <Stack
            spacing={1.5}
            sx={{
                display: { xs: "flex", md: "none" },
                ...sx
            }}
        >
            {children}
        </Stack>
    );
}

export function DesktopTableWrapper({ children, sx }) {
    return (
        <Box
            sx={{
                display: { xs: "none", md: "block" },
                ...sx
            }}
        >
            {children}
        </Box>
    );
}

export default function MobileDataCard({ title, subtitle, fields = [], actions }) {
    return (
        <Paper
            variant="outlined"
            sx={{
                p: 2,
                borderRadius: 2
            }}
        >
            <Stack
                direction="row"
                alignItems="flex-start"
                justifyContent="space-between"
                spacing={1}
            >
                <Box sx={{ minWidth: 0, flex: 1 }}>
                    {title && (
                        typeof title === "string" || typeof title === "number" ? (
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }} noWrap>
                                {title}
                            </Typography>
                        ) : (
                            <Box sx={{ fontWeight: 700 }}>{title}</Box>
                        )
                    )}
                    {subtitle && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                            {subtitle}
                        </Typography>
                    )}
                </Box>
                {actions && (
                    <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
                        {actions}
                    </Stack>
                )}
            </Stack>

            {fields.length > 0 && (
                <Stack spacing={0.75} sx={{ mt: 1.5 }}>
                    {fields.map((field) => (
                        <Box key={field.label}>
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ fontWeight: 600, display: "block" }}
                            >
                                {field.label}
                            </Typography>
                            <Box sx={{ mt: 0.25 }}>
                                {typeof field.value === "string" ||
                                typeof field.value === "number" ? (
                                    <Typography variant="body2">{field.value}</Typography>
                                ) : (
                                    field.value
                                )}
                            </Box>
                        </Box>
                    ))}
                </Stack>
            )}
        </Paper>
    );
}
