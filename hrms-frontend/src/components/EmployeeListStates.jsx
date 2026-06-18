import {
    Alert,
    Box,
    Button,
    Paper,
    Skeleton,
    Stack,
    Typography
} from "@mui/material";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import SearchIcon from "@mui/icons-material/Search";
import ErrorIcon from "@mui/icons-material/Error";

export function EmployeeListSkeleton({ count = 6 }) {
    return (
        <Stack spacing={1.5}>
            {Array.from({ length: count }, (_, index) => (
                <Paper
                    key={index}
                    variant="outlined"
                    sx={{
                        p: 2,
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        borderRadius: 2
                    }}
                >
                    <Skeleton variant="circular" width={52} height={52} />
                    <Box sx={{ flex: 1 }}>
                        <Skeleton width="35%" height={28} sx={{ mb: 0.75 }} />
                        <Skeleton width="55%" height={20} sx={{ mb: 0.75 }} />
                        <Skeleton width="70%" height={20} />
                    </Box>
                </Paper>
            ))}
        </Stack>
    );
}

export function EmployeeListError({ message, onRetry }) {
    return (
        <Paper
            variant="outlined"
            sx={{ p: 4, textAlign: "center", borderRadius: 2 }}
        >
            <ErrorIcon
                sx={{ fontSize: 48, color: "error.main", mb: 1.5 }}
            />
            <Typography color="text.secondary" gutterBottom>
                {message || "Failed to load employees"}
            </Typography>
            {onRetry && (
                <Button variant="outlined" onClick={onRetry} sx={{ mt: 1 }}>
                    Try Again
                </Button>
            )}
        </Paper>
    );
}

export function EmployeeListEmpty({
    variant = "filtered",
    title,
    description,
    action
}) {
    const isFiltered = variant === "filtered";
    const Icon = isFiltered ? SearchIcon : PeopleAltIcon;

    return (
        <Paper
            variant="outlined"
            sx={{ p: 4, textAlign: "center", borderRadius: 2 }}
        >
            <Icon
                sx={{
                    fontSize: 48,
                    color: "text.disabled",
                    mb: 1.5
                }}
            />
            <Typography color="text.secondary" gutterBottom>
                {title
                    || (isFiltered
                        ? "No employees match your search or filters"
                        : "No employees to display")}
            </Typography>
            {description && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {description}
                </Typography>
            )}
            {action}
        </Paper>
    );
}

export function EmployeeListNotice({ children }) {
    return (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
            {children}
        </Alert>
    );
}
