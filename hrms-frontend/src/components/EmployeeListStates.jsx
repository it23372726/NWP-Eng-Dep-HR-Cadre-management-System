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

function ListItemSkeleton() {
    return (
        <Paper
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
    );
}

function CardItemSkeleton() {
    return (
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
            <Skeleton variant="rectangular" height={4} />
            <Box sx={{ p: 2 }}>
                <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
                    <Skeleton variant="circular" width={56} height={56} />
                    <Box sx={{ flex: 1 }}>
                        <Skeleton width="70%" height={24} sx={{ mb: 0.5 }} />
                        <Skeleton width="50%" height={16} />
                    </Box>
                </Stack>
                <Skeleton width="90%" height={18} sx={{ mb: 1 }} />
                <Skeleton width="75%" height={18} sx={{ mb: 1.5 }} />
                <Stack direction="row" spacing={0.75}>
                    <Skeleton variant="rounded" width={72} height={24} />
                    <Skeleton variant="rounded" width={88} height={24} />
                </Stack>
            </Box>
        </Paper>
    );
}

export function EmployeeListSkeleton({ count = 6, variant = "list" }) {
    if (variant === "grid") {
        return (
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: {
                        xs: "1fr",
                        sm: "repeat(2, 1fr)",
                        lg: "repeat(3, 1fr)"
                    },
                    gap: 2
                }}
            >
                {Array.from({ length: count }, (_, index) => (
                    <CardItemSkeleton key={index} />
                ))}
            </Box>
        );
    }

    return (
        <Stack spacing={1.5}>
            {Array.from({ length: count }, (_, index) => (
                <ListItemSkeleton key={index} />
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
