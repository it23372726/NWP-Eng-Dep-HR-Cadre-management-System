import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Collapse,
    FormControl,
    FormControlLabel,
    Grid,
    IconButton,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Stack,
    Switch,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    TextField,
    Tooltip,
    Typography
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import FilterListIcon from "@mui/icons-material/FilterList";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import AuditTrailDetailDialog from "../components/AuditTrailDetailDialog";
import DateInput from "../components/DateInput";
import FormSection from "../components/FormSection";
import {
    exportAuditLogsExcel,
    getAuditLogById,
    searchAuditLogs
} from "../services/auditService";
import { getApiErrorMessage } from "../constants/hrms";
import {
    AUDIT_ACTION_COLORS,
    AUDIT_ACTIONS,
    AUDIT_MODULES,
    AUDIT_STATUSES,
    AUDIT_STATUS_COLORS,
    formatAuditAction,
    formatAuditModule,
    formatAuditStatus,
    formatAuditTimestamp,
    formatActivitySummary,
    formatResourceMeta,
    formatResourceSummary
} from "../utils/auditLogDisplay";

const EMPTY_FILTERS = {
    username: "",
    action: "",
    sourceModule: "",
    status: "",
    entityType: "",
    entityId: "",
    ipAddress: "",
    search: "",
    from: "",
    to: "",
    sensitive: false
};

function buildSearchParams(filters, page, size) {
    return {
        page,
        size,
        username: filters.username || undefined,
        action: filters.action || undefined,
        sourceModule: filters.sourceModule || undefined,
        status: filters.status || undefined,
        entityType: filters.entityType || undefined,
        entityId: filters.entityId || undefined,
        ipAddress: filters.ipAddress || undefined,
        search: filters.search || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
        sensitive: filters.sensitive ? true : undefined
    };
}

export default function AuditLogPage() {
    const [rows, setRows] = useState([]);
    const [totalElements, setTotalElements] = useState(0);
    const [page, setPage] = useState(0);
    const [size, setSize] = useState(25);
    const [loading, setLoading] = useState(false);
    const [filtersOpen, setFiltersOpen] = useState(true);
    const [filters, setFilters] = useState(EMPTY_FILTERS);
    const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);

    const [selectedLog, setSelectedLog] = useState(null);
    const [detailOpen, setDetailOpen] = useState(false);

    const loadLogs = useCallback(async () => {
        setLoading(true);
        try {
            const data = await searchAuditLogs(buildSearchParams(appliedFilters, page, size));
            setRows(data.content || []);
            setTotalElements(data.totalElements || 0);
        } catch (error) {
            toast.error(getApiErrorMessage(error, "Failed to load audit trail"));
        } finally {
            setLoading(false);
        }
    }, [appliedFilters, page, size]);

    useEffect(() => {
        loadLogs();
    }, [loadLogs]);

    const handleApplyFilters = () => {
        setPage(0);
        setAppliedFilters({ ...filters });
    };

    const handleResetFilters = () => {
        setFilters(EMPTY_FILTERS);
        setAppliedFilters(EMPTY_FILTERS);
        setPage(0);
    };

    const handleOpenDetail = async (id) => {
        try {
            const detail = await getAuditLogById(id);
            setSelectedLog(detail);
            setDetailOpen(true);
        } catch (error) {
            toast.error(getApiErrorMessage(error, "Failed to load audit event detail"));
        }
    };

    const handleExport = async () => {
        try {
            const blob = await exportAuditLogsExcel(buildSearchParams(appliedFilters, 0, 10000));
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `audit-trail-${new Date().toISOString().slice(0, 10)}.xlsx`;
            link.click();
            window.URL.revokeObjectURL(url);
            toast.success("Audit trail exported");
        } catch (error) {
            toast.error(getApiErrorMessage(error, "Failed to export audit trail"));
        }
    };

    const activeFilterCount = Object.entries(appliedFilters).filter(([key, value]) => {
        if (key === "sensitive") return value === true;
        return Boolean(value);
    }).length;

    return (
        <Box>
            <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                alignItems={{ xs: "stretch", sm: "flex-start" }}
                spacing={2}
                sx={{ mb: 2 }}
            >
                <Box>
                    <Typography variant="h5" fontWeight={800}>
                        Audit Trail
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 720, mt: 0.5 }}>
                        Immutable security event log aligned with standard audit dimensions:
                        actor, event, resource, request context, outcome, and integrity metadata.
                    </Typography>
                </Box>
                <Stack direction="row" spacing={1} flexShrink={0}>
                    <Tooltip title="Refresh">
                        <span>
                            <IconButton onClick={loadLogs} disabled={loading}>
                                <RefreshIcon />
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Button
                        variant="outlined"
                        startIcon={<DownloadIcon />}
                        onClick={handleExport}
                    >
                        Export
                    </Button>
                </Stack>
            </Stack>

            <Alert severity="info" sx={{ mb: 2 }}>
                Records are append-only, retained for 7 years, and include an integrity hash for tamper detection.
                Sensitive values (passwords, photo binary data) are excluded from change snapshots.
            </Alert>

            <FormSection
                title="Search & Filter"
                description={
                    activeFilterCount > 0
                        ? `${activeFilterCount} active filter${activeFilterCount === 1 ? "" : "s"} applied`
                        : "Narrow events by actor, type, module, resource, date range, or outcome"
                }
            >
                <Stack direction="row" spacing={1} sx={{ mb: filtersOpen ? 2 : 0 }}>
                    <Button
                        size="small"
                        startIcon={<FilterListIcon />}
                        endIcon={filtersOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        onClick={() => setFiltersOpen((open) => !open)}
                    >
                        {filtersOpen ? "Hide filters" : "Show filters"}
                    </Button>
                </Stack>

                <Collapse in={filtersOpen}>
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <TextField
                                fullWidth
                                size="small"
                                label="Actor (username)"
                                value={filters.username}
                                onChange={(e) =>
                                    setFilters((prev) => ({ ...prev, username: e.target.value }))
                                }
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Event type</InputLabel>
                                <Select
                                    label="Event type"
                                    value={filters.action}
                                    onChange={(e) =>
                                        setFilters((prev) => ({ ...prev, action: e.target.value }))
                                    }
                                >
                                    <MenuItem value="">All</MenuItem>
                                    {AUDIT_ACTIONS.map((action) => (
                                        <MenuItem key={action} value={action}>
                                            {formatAuditAction(action)}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Module</InputLabel>
                                <Select
                                    label="Module"
                                    value={filters.sourceModule}
                                    onChange={(e) =>
                                        setFilters((prev) => ({ ...prev, sourceModule: e.target.value }))
                                    }
                                >
                                    <MenuItem value="">All</MenuItem>
                                    {AUDIT_MODULES.map((module) => (
                                        <MenuItem key={module} value={module}>
                                            {formatAuditModule(module)}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Outcome</InputLabel>
                                <Select
                                    label="Outcome"
                                    value={filters.status}
                                    onChange={(e) =>
                                        setFilters((prev) => ({ ...prev, status: e.target.value }))
                                    }
                                >
                                    <MenuItem value="">All</MenuItem>
                                    {AUDIT_STATUSES.map((status) => (
                                        <MenuItem key={status} value={status}>
                                            {formatAuditStatus(status)}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <TextField
                                fullWidth
                                size="small"
                                label="Resource type"
                                placeholder="e.g. Employee"
                                value={filters.entityType}
                                onChange={(e) =>
                                    setFilters((prev) => ({ ...prev, entityType: e.target.value }))
                                }
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <TextField
                                fullWidth
                                size="small"
                                label="Source IP"
                                value={filters.ipAddress}
                                onChange={(e) =>
                                    setFilters((prev) => ({ ...prev, ipAddress: e.target.value }))
                                }
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <DateInput
                                label="From date"
                                value={filters.from}
                                onChange={(e) =>
                                    setFilters((prev) => ({ ...prev, from: e.target.value }))
                                }
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <DateInput
                                label="To date"
                                value={filters.to}
                                onChange={(e) =>
                                    setFilters((prev) => ({ ...prev, to: e.target.value }))
                                }
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 6 }}>
                            <TextField
                                fullWidth
                                size="small"
                                label="Keyword search"
                                placeholder="Resource label, path, or username"
                                value={filters.search}
                                onChange={(e) =>
                                    setFilters((prev) => ({ ...prev, search: e.target.value }))
                                }
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={filters.sensitive}
                                        onChange={(e) =>
                                            setFilters((prev) => ({
                                                ...prev,
                                                sensitive: e.target.checked
                                            }))
                                        }
                                    />
                                }
                                label="Sensitive events only"
                            />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <Stack direction="row" spacing={1}>
                                <Button
                                    variant="contained"
                                    startIcon={<SearchIcon />}
                                    onClick={handleApplyFilters}
                                    disabled={loading}
                                >
                                    Apply filters
                                </Button>
                                <Button variant="text" onClick={handleResetFilters} disabled={loading}>
                                    Reset
                                </Button>
                            </Stack>
                        </Grid>
                    </Grid>
                </Collapse>
            </FormSection>

            <TableContainer component={Paper}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 700, width: 72 }}>Event ID</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Timestamp</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Actor</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Activity</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Event</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Module</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Resource</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Source IP</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Outcome</TableCell>
                            <TableCell sx={{ fontWeight: 700, width: 56 }} align="center" />
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading && (
                            <TableRow>
                                <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                                    <CircularProgress size={28} />
                                </TableCell>
                            </TableRow>
                        )}
                        {!loading && rows.map((row) => (
                            <TableRow key={row.id} hover>
                                <TableCell sx={{ fontFamily: "monospace", fontSize: "0.8rem" }}>
                                    {row.id}
                                </TableCell>
                                <TableCell sx={{ whiteSpace: "nowrap" }}>
                                    {formatAuditTimestamp(row.occurredAt)}
                                </TableCell>
                                <TableCell>
                                    <Typography variant="body2">{row.username}</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {row.userRole}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Typography variant="body2" fontWeight={600}>
                                        {formatActivitySummary(row) !== "—"
                                            ? formatActivitySummary(row)
                                            : formatAuditAction(row.action)}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        size="small"
                                        label={formatAuditAction(row.action)}
                                        color={AUDIT_ACTION_COLORS[row.action] || "default"}
                                        variant="outlined"
                                    />
                                </TableCell>
                                <TableCell>
                                    <Typography variant="body2">
                                        {formatAuditModule(row.sourceModule)}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Typography variant="body2">
                                        {formatResourceSummary(row)}
                                    </Typography>
                                    {formatResourceMeta(row) && (
                                        <Typography variant="caption" color="text.secondary">
                                            {formatResourceMeta(row)}
                                        </Typography>
                                    )}
                                </TableCell>
                                <TableCell sx={{ fontFamily: "monospace", fontSize: "0.8rem" }}>
                                    {row.ipAddress || "—"}
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        size="small"
                                        label={formatAuditStatus(row.status)}
                                        color={AUDIT_STATUS_COLORS[row.status] || "default"}
                                        variant="outlined"
                                    />
                                </TableCell>
                                <TableCell align="center">
                                    <Tooltip title="View event detail">
                                        <IconButton size="small" onClick={() => handleOpenDetail(row.id)}>
                                            <VisibilityIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                </TableCell>
                            </TableRow>
                        ))}
                        {!loading && rows.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                                    <Typography variant="body2" color="text.secondary">
                                        No audit events match the current filters.
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <TablePagination
                component="div"
                count={totalElements}
                page={page}
                onPageChange={(_, newPage) => setPage(newPage)}
                rowsPerPage={size}
                onRowsPerPageChange={(e) => {
                    setSize(parseInt(e.target.value, 10));
                    setPage(0);
                }}
                rowsPerPageOptions={[10, 25, 50, 100]}
            />

            <AuditTrailDetailDialog
                open={detailOpen}
                log={selectedLog}
                onClose={() => setDetailOpen(false)}
            />
        </Box>
    );
}
