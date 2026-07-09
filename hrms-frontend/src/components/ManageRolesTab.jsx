import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Alert,
    Box,
    Checkbox,
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
    Typography
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

import { DesktopTableWrapper } from "./MobileDataCard";
import { getApiErrorMessage } from "../constants/hrms";
import { PERMISSION_LABELS, EMPLOYEE_PERMISSIONS } from "../constants/permissions";
import {
    getRolePermissions,
    updateRolePermissions
} from "../services/rolePermissionService";

const EMPLOYEE_PERMISSION_SET = new Set(EMPLOYEE_PERMISSIONS);

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
            setMatrix((prev) => ({
                ...prev,
                roles: prev.roles.map((row) =>
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
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!matrix) {
        return (
            <Alert severity="error">
                Unable to load role permissions.
            </Alert>
        );
    }

    return (
        <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Configure module access for each role. SUPER_ADMIN always has full access and is not shown here.
                Employee-View and Employee-Edit are mutually exclusive — enabling one clears the other.
                Changes apply immediately for API access; users need to re-login to update the sidebar.
            </Typography>

            <DesktopTableWrapper>
                <TableContainer component={Paper}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Role</TableCell>
                                {matrix.permissions.map((permission) => (
                                    <TableCell key={permission} align="center">
                                        {PERMISSION_LABELS[permission] || permission}
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {matrix.roles.map((row) => (
                                <TableRow key={row.role} hover>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight={600}>
                                            {row.role}
                                        </Typography>
                                    </TableCell>
                                    {matrix.permissions.map((permission) => (
                                        <TableCell key={permission} align="center">
                                            <Checkbox
                                                checked={Boolean(row.permissions[permission])}
                                                disabled={savingRole === row.role}
                                                onChange={(e) =>
                                                    handleToggle(
                                                        row.role,
                                                        permission,
                                                        e.target.checked
                                                    )
                                                }
                                            />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </DesktopTableWrapper>

            <Stack
                spacing={1}
                sx={{
                    display: { xs: "flex", md: "none" }
                }}
            >
                {matrix.roles.map((row) => (
                    <Accordion
                        key={row.role}
                        disableGutters
                        variant="outlined"
                        sx={{ borderRadius: 2, "&:before": { display: "none" } }}
                    >
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                {row.role}
                            </Typography>
                        </AccordionSummary>
                        <AccordionDetails sx={{ pt: 0 }}>
                            <Stack spacing={0.5}>
                                {matrix.permissions.map((permission) => (
                                    <FormControlLabel
                                        key={permission}
                                        control={
                                            <Checkbox
                                                checked={Boolean(row.permissions[permission])}
                                                disabled={savingRole === row.role}
                                                onChange={(e) =>
                                                    handleToggle(
                                                        row.role,
                                                        permission,
                                                        e.target.checked
                                                    )
                                                }
                                                size="small"
                                            />
                                        }
                                        label={
                                            PERMISSION_LABELS[permission] || permission
                                        }
                                        sx={{ mx: 0 }}
                                    />
                                ))}
                            </Stack>
                        </AccordionDetails>
                    </Accordion>
                ))}
            </Stack>
        </Box>
    );
}
