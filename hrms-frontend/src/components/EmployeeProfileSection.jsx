import { Box, Paper, Stack, Typography } from "@mui/material";

export function EmployeeProfileSection({
    icon,
    title,
    description,
    action,
    children,
    contentSx,
    sx
}) {
    return (
        <Paper
            variant="outlined"
            sx={{
                overflow: "hidden",
                borderRadius: 3,
                boxShadow: 1,
                ...sx
            }}
        >
            <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.5}
                sx={{
                    px: { xs: 2, sm: 2.5 },
                    py: 2,
                    bgcolor: "grey.50",
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    alignItems: { xs: "stretch", sm: "center" },
                    justifyContent: "space-between"
                }}
            >
                <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", minWidth: 0 }}>
                    {icon && (
                        <Box
                            sx={{
                                width: 40,
                                height: 40,
                                borderRadius: 2.5,
                                display: "grid",
                                placeItems: "center",
                                bgcolor: "primary.50",
                                color: "primary.main",
                                flexShrink: 0
                            }}
                        >
                            {icon}
                        </Box>
                    )}
                    <Box sx={{ minWidth: 0 }}>
                        <Typography variant="h6">{title}</Typography>
                        {description && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                                {description}
                            </Typography>
                        )}
                    </Box>
                </Stack>
                {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
            </Stack>
            <Box sx={{ p: { xs: 2, sm: 2.5 }, ...contentSx }}>
                {children}
            </Box>
        </Paper>
    );
}

export function EmployeeProfileSubsection({ title, description, action, children }) {
    return (
        <Box>
            <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                sx={{
                    mb: 1.5,
                    alignItems: { xs: "stretch", sm: "flex-end" },
                    justifyContent: "space-between"
                }}
            >
                <Box>
                    <Typography
                        variant="subtitle2"
                        sx={{ fontWeight: 750, color: "text.primary" }}
                    >
                        {title}
                    </Typography>
                    {description && (
                        <Typography variant="caption" color="text.secondary">
                            {description}
                        </Typography>
                    )}
                </Box>
                {action}
            </Stack>
            {children}
        </Box>
    );
}

export function EmployeeProfileInfoGrid({ children, columns = 3, sx }) {
    return (
        <Box
            sx={{
                display: "grid",
                gridTemplateColumns: {
                    xs: "minmax(0, 1fr)",
                    sm: "repeat(2, minmax(0, 1fr))",
                    lg: `repeat(${columns}, minmax(0, 1fr))`
                },
                gap: 1.25,
                ...sx
            }}
        >
            {children}
        </Box>
    );
}

export function EmployeeProfileInfoItem({ label, value, icon, wide = false, sx }) {
    const displayValue = value === null || value === undefined || value === "" ? "—" : value;

    return (
        <Box
            sx={{
                p: 1.5,
                minWidth: 0,
                minHeight: 72,
                borderRadius: 2.25,
                bgcolor: "grey.50",
                border: "1px solid",
                borderColor: "divider",
                gridColumn: wide ? "1 / -1" : "auto",
                ...sx
            }}
        >
            <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", mb: 0.5 }}>
                {icon && (
                    <Box sx={{ color: "text.secondary", display: "flex", "& svg": { fontSize: 16 } }}>
                        {icon}
                    </Box>
                )}
                <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontWeight: 700 }}
                >
                    {label}
                </Typography>
            </Stack>
            {typeof displayValue === "string" || typeof displayValue === "number" ? (
                <Typography
                    variant="body2"
                    sx={{ fontWeight: 650, overflowWrap: "anywhere" }}
                >
                    {displayValue}
                </Typography>
            ) : (
                displayValue
            )}
        </Box>
    );
}

export function EmployeeProfileEmptyState({ icon, title, description }) {
    return (
        <Paper
            variant="outlined"
            sx={{
                p: { xs: 3, sm: 5 },
                textAlign: "center",
                borderRadius: 3,
                borderStyle: "dashed"
            }}
        >
            {icon && (
                <Box sx={{ color: "text.disabled", mb: 1, "& svg": { fontSize: 42 } }}>
                    {icon}
                </Box>
            )}
            <Typography variant="h6">{title}</Typography>
            {description && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {description}
                </Typography>
            )}
        </Paper>
    );
}
