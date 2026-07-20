import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Alert,
    Box,
    Checkbox,
    Chip,
    CircularProgress,
    FormControlLabel,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tooltip,
    Typography
} from "@mui/material";
import {
    AdminPanelSettingsRounded as AdminPanelIcon,
    ExpandMoreRounded as ExpandMoreIcon,
    InfoOutlined as InfoIcon,
    ShieldOutlined as ShieldIcon
} from "@mui/icons-material";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

import { DesktopTableWrapper } from "./MobileDataCard";
import { getApiErrorMessage } from "../constants/hrms";
import { PERMISSION_LABELS, EMPLOYEE_PERMISSIONS } from "../constants/permissions";
import { ROLE_DESCRIPTIONS } from "../constants/roles";
import {
    getRolePermissions,
    updateRolePermissions
} from "../services/rolePermissionService";

const EMPLOYEE_PERMISSION_SET = new Set(EMPLOYEE_PERMISSIONS);

const PERMISSION_DESCRIPTIONS = {
    DASHBOARD: "View workforce summaries",
    EMPLOYEE_VIEW: "Read employee records",
    EMPLOYEE_EDIT: "Create and update employees",
    ORGANIZATION: "Manage organization data",
    REPORTS: "View reporting modules",
    ADMINISTRATIONS: "Access administration tools"
};

const formatRole = (role = "") =>
    role
        .toLowerCase()
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");

export default function ManageRolesTab() {
    const [matrix, setMatrix] = useState(null);
    const [loading, setLoading] = useState(true);
    const [savingRole, setSavingRole] = useState(null);

    const loadMatrix = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getRolePermissions();
            setMatrix(data);
        } catch (error) {
            toast.error(getApiErrorMessage(error, "Failed to load role permissions"));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadMatrix();
    }, [loadMatrix]);

    const handleToggle = async (role, permission, checked) => {
        if (!matrix) {
            return;
        }

        const roleRow = matrix.roles.find((row) => row.role === role);
        if (!roleRow) {
            return;
        }

        let updatedPermissions = matrix.permissions.filter(
            (perm) => roleRow.permissions[perm] && perm !== permission
        );

        if (checked) {
            if (EMPLOYEE_PERMISSION_SET.has(permission)) {
                updatedPermissions = updatedPermissions.filter(
                    (perm) => !EMPLOYEE_PERMISSION_SET.has(perm)
                );
            }
            updatedPermissions.push(permission);
        }

        setSavingRole(role);
        try {
            const updatedRow = await updateRolePermissions(role, updatedPermissions);
            setMatrix((previous) => ({
                ...previous,
                roles: previous.roles.map((row) =>
                    row.role === role ? updatedRow : row
                )
            }));
            toast.success(`Updated permissions for ${role}`);
        } catch (error) {
            toast.error(getApiErrorMessage(error, "Failed to update role permissions"));
        } finally {
            setSavingRole(null);
        }
    };

    if (loading) {
        return (
            <Paper variant="outlined" sx={{ py: 7, display: "grid", placeItems: "center" }}>
                <Stack spacing={1.5} sx={{ alignItems: "center" }}>
                    <CircularProgress size={30} />
                    <Typography variant="body2" color="text.secondary">
                        Loading role permissions…
                    </Typography>
                </Stack>
            </Paper>
        );
    }

    if (!matrix) {
        return <Alert severity="error">Unable to load role permissions.</Alert>;
    }

    return (
        <Box>
            <Paper
                variant="outlined"
                sx={{
                    p: { xs: 2, sm: 2.5 },
                    mb: 2,
                    background: (theme) =>
                        `linear-gradient(135deg, ${theme.palette.background.paper}, ${theme.palette.secondary[50]})`
                }}
            >
                <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={2}
                    sx={{
                        alignItems: { xs: "flex-start", sm: "center" },
                        justifyContent: "space-between"
                    }}
                >
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                        <Box
                            sx={{
                                width: 46,
                                height: 46,
                                borderRadius: 3,
                                display: "grid",
                                placeItems: "center",
                                bgcolor: "secondary.light",
                                color: "secondary.dark",
                                flexShrink: 0
                            }}
                        >
                            <AdminPanelIcon />
                        </Box>
                        <Box>
                            <Typography variant="h6">Permission matrix</Typography>
                            <Typography variant="body2" color="text.secondary">
                                Choose which modules each role can access.
                            </Typography>
                        </Box>
                    </Stack>
                    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
                        <Chip label={`${matrix.roles.length} configurable roles`} size="small" variant="outlined" />
                        <Chip label={`${matrix.permissions.length} permissions`} size="small" color="secondary" variant="outlined" />
                    </Stack>
                </Stack>
            </Paper>

            <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 2, alignItems: "center" }}>
                Super Admin always has full access. Employee View and Employee Edit are mutually exclusive. Changes apply to API access immediately; users must sign in again to refresh their navigation.
            </Alert>

            <DesktopTableWrapper>
                <TableContainer component={Paper} variant="outlined" sx={{ overflowX: "auto" }}>
                    <Table sx={{ minWidth: 900 }}>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ minWidth: 210 }}>Access role</TableCell>
                                {matrix.permissions.map((permission) => (
                                    <TableCell key={permission} align="center" sx={{ minWidth: 128 }}>
                                        <Tooltip title={PERMISSION_DESCRIPTIONS[permission] || permission} arrow>
                                            <Box component="span">
                                                {PERMISSION_LABELS[permission] || permission}
                                            </Box>
                                        </Tooltip>
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {matrix.roles.map((row) => {
                                const enabledCount = matrix.permissions.filter(
                                    (permission) => row.permissions[permission]
                                ).length;

                                return (
                                    <TableRow key={row.role} hover>
                                        <TableCell>
                                            <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
                                                <Box
                                                    sx={{
                                                        width: 36,
                                                        height: 36,
                                                        borderRadius: 2.25,
                                                        display: "grid",
                                                        placeItems: "center",
                                                        bgcolor: "primary.50",
                                                        color: "primary.main",
                                                        flexShrink: 0
                                                    }}
                                                >
                                                    <ShieldIcon fontSize="small" />
                                                </Box>
                                                <Box>
                                                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                                        {formatRole(row.role)}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {enabledCount} of {matrix.permissions.length} enabled
                                                    </Typography>
                                                </Box>
                                            </Stack>
                                        </TableCell>
                                        {matrix.permissions.map((permission) => (
                                            <TableCell key={permission} align="center">
                                                <Checkbox
                                                    checked={Boolean(row.permissions[permission])}
                                                    disabled={savingRole === row.role}
                                                    onChange={(event) =>
                                                        handleToggle(
                                                            row.role,
                                                            permission,
                                                            event.target.checked
                                                        )
                                                    }
                                                    slotProps={{
                                                        input: {
                                                            "aria-label": `${PERMISSION_LABELS[permission] || permission} for ${formatRole(row.role)}`
                                                        }
                                                    }}
                                                />
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            </DesktopTableWrapper>

            <Stack spacing={1.25} sx={{ display: { xs: "flex", md: "none" } }}>
                {matrix.roles.map((row) => {
                    const enabledCount = matrix.permissions.filter(
                        (permission) => row.permissions[permission]
                    ).length;

                    return (
                        <Accordion
                            key={row.role}
                            disableGutters
                            variant="outlined"
                            sx={{
                                borderRadius: "14px !important",
                                overflow: "hidden",
                                "&:before": { display: "none" }
                            }}
                        >
                            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 2 }}>
                                <Stack
                                    direction="row"
                                    spacing={1.25}
                                    sx={{ alignItems: "center", flex: 1, minWidth: 0 }}
                                >
                                    <Box
                                        sx={{
                                            width: 38,
                                            height: 38,
                                            borderRadius: 2.25,
                                            display: "grid",
                                            placeItems: "center",
                                            bgcolor: "primary.50",
                                            color: "primary.main",
                                            flexShrink: 0
                                        }}
                                    >
                                        {savingRole === row.role ? (
                                            <CircularProgress size={18} />
                                        ) : (
                                            <ShieldIcon fontSize="small" />
                                        )}
                                    </Box>
                                    <Box sx={{ minWidth: 0 }}>
                                        <Typography variant="subtitle2" noWrap>
                                            {formatRole(row.role)}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {enabledCount} of {matrix.permissions.length} permissions enabled
                                        </Typography>
                                    </Box>
                                </Stack>
                            </AccordionSummary>
                            <AccordionDetails sx={{ px: 2, pt: 0, pb: 2 }}>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                                    {ROLE_DESCRIPTIONS[row.role]}
                                </Typography>
                                <Stack spacing={0.75}>
                                    {matrix.permissions.map((permission) => (
                                        <Paper
                                            key={permission}
                                            variant="outlined"
                                            sx={{ px: 1.25, py: 0.75, bgcolor: "grey.50" }}
                                        >
                                            <FormControlLabel
                                                control={
                                                    <Checkbox
                                                        checked={Boolean(row.permissions[permission])}
                                                        disabled={savingRole === row.role}
                                                        onChange={(event) =>
                                                            handleToggle(
                                                                row.role,
                                                                permission,
                                                                event.target.checked
                                                            )
                                                        }
                                                        size="small"
                                                    />
                                                }
                                                label={
                                                    <Box>
                                                        <Typography variant="body2" sx={{ fontWeight: 650 }}>
                                                            {PERMISSION_LABELS[permission] || permission}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {PERMISSION_DESCRIPTIONS[permission]}
                                                        </Typography>
                                                    </Box>
                                                }
                                                sx={{ m: 0, width: "100%", alignItems: "center" }}
                                            />
                                        </Paper>
                                    ))}
                                </Stack>
                            </AccordionDetails>
                        </Accordion>
                    );
                })}
            </Stack>
        </Box>
    );
}
