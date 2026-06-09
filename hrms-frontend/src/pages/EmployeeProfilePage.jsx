import {
    Typography,
    Paper,
    Box,
    Button,
    Stack,
    Grid,
    Divider,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText
} from "@mui/material";

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import toast from "react-hot-toast";

import { getEmployeeById } from "../services/employeeService";
import { getDesignations } from "../services/designationService";
import {
    getEmployeeActions,
    transferOutEmployee,
    promoteEmployee,
    retireEmployee,
    markEmployeeDeath,
    dismissEmployee,
    transferInEmployee,
    appointNewEmployee,
    makeEmployeePermanent,
    deleteEmployeePermanently
} from "../services/employeeLifecycleService";

import EmployeeStatusChip from "../components/EmployeeStatusChip";
import PermanentStatusChip from "../components/PermanentStatusChip";
import EmployeeActionHistoryTable from "../components/EmployeeActionHistoryTable";
import TransferOutDialog from "../components/lifecycle/TransferOutDialog";
import TransferInDialog from "../components/lifecycle/TransferInDialog";
import NewAppointmentDialog from "../components/lifecycle/NewAppointmentDialog";
import PromotionDialog from "../components/lifecycle/PromotionDialog";
import SimpleLifecycleDialog from "../components/lifecycle/SimpleLifecycleDialog";
import MakePermanentDialog from "../components/lifecycle/MakePermanentDialog";
import DeleteEmployeeDialog from "../components/DeleteEmployeeDialog";
import {
    getApiErrorMessage,
    PERMANENT_STATUS_LABELS
} from "../constants/hrms";

const formatDate = (date) => date
    ? new Date(date).toLocaleDateString("en-GB")
    : "—";

const getThreeYearRequirementDate = (dateOfFirstAppointment) => {
    if (!dateOfFirstAppointment) {
        return null;
    }

    const date = new Date(dateOfFirstAppointment);
    date.setFullYear(date.getFullYear() + 3);
    return date.toISOString().split("T")[0];
};

const hasCompletedThreeYears = (dateOfFirstAppointment) => {
    const requirementDate = getThreeYearRequirementDate(dateOfFirstAppointment);
    if (!requirementDate) {
        return false;
    }

    return new Date() >= new Date(`${requirementDate}T00:00:00`);
};

const meetsGradeThreePermanentRequirements = (employee) => {
    if (employee?.employmentType !== "PERMANENT" || employee?.grade !== "III") {
        return false;
    }

    return Boolean(
        employee.ebGrade3Passed
        && employee.languageQualificationPassed
        && employee.medicalReportCompleted
        && employee.olApproved
        && employee.alApproved
        && employee.degreeApproved
        && employee.birthCertificateApproved
        && hasCompletedThreeYears(employee.dateOfFirstAppointment)
    );
};

export default function EmployeeProfilePage() {
    const { id } = useParams();

    const [employee, setEmployee] = useState(null);
    const [actionHistory, setActionHistory] = useState([]);
    const [designations, setDesignations] = useState([]);
    const [openTransferOut, setOpenTransferOut] = useState(false);
    const [openTransferIn, setOpenTransferIn] = useState(false);
    const [openNewAppointment, setOpenNewAppointment] = useState(false);
    const [openPromote, setOpenPromote] = useState(false);
    const [openRetire, setOpenRetire] = useState(false);
    const [openDeath, setOpenDeath] = useState(false);
    const [openDismiss, setOpenDismiss] = useState(false);
    const [openMakePermanent, setOpenMakePermanent] = useState(false);
    const [openDelete, setOpenDelete] = useState(false);
    const [anchorEl, setAnchorEl] = useState(null);

    const isActive = employee?.status === "ACTIVE";

    useEffect(() => {
        loadProfile();
    }, [id]);

    const loadProfile = async () => {
        try {
            const [selectedEmployee, actions, designationsData] = await Promise.all([
                getEmployeeById(id),
                getEmployeeActions(id),
                getDesignations()
            ]);

            setEmployee(selectedEmployee);
            setActionHistory(actions);
            setDesignations(designationsData);
        } catch {
            toast.error("Failed to load profile");
        }
    };

    const handleLifecycle = async (
        action,
        successMessage,
        fallbackErrorMessage
    ) => {
        try {
            await action();
            toast.success(successMessage);
            loadProfile();
        } catch (error) {
            toast.error(fallbackErrorMessage || getApiErrorMessage(error));
        }
    };

    if (!employee) {
        return <Typography>Loading...</Typography>;
    }

    const serviceLabel = employee.designation?.service
        ? `${employee.designation.service.serviceCode} — ${employee.designation.service.description}`
        : "—";
    const canMakePermanent =
        meetsGradeThreePermanentRequirements(employee)
        && employee.qualifiedForPermanent
        && employee.permanentStatus !== "PERMANENT";
    const threeYearDate = getThreeYearRequirementDate(
        employee.dateOfFirstAppointment
    );

    return (
        <Box>
            <Stack
                direction="row"
                sx={{
                    mb: 3,
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                    gap: 2
                }}
            >
                <Box>
                    <Stack
                        direction="row"
                        spacing={1}
                        sx={{ alignItems: "center" }}
                    >
                        <Typography variant="h4">
                            {employee.fullName}
                        </Typography>
                        <EmployeeStatusChip status={employee.status} />
                    </Stack>
                    <Typography color="text.secondary">
                        {employee.employeeNo} · {employee.designation?.designationName}
                    </Typography>
                </Box>

                {isActive && (
                    <Box>
                        <Button
                            variant="contained"
                            size="small"
                            onClick={(e) => setAnchorEl(e.currentTarget)}
                        >
                            Employee Actions ▼
                        </Button>
                        <Menu
                            anchorEl={anchorEl}
                            open={Boolean(anchorEl)}
                            onClose={() => setAnchorEl(null)}
                            PaperProps={{
                                sx: { minWidth: 240 }
                            }}
                        >
                            <Box sx={{ px: 2, py: 1 }}>
                                <Typography variant="caption" sx={{ fontWeight: "bold", color: "text.secondary" }}>
                                    Employment Actions
                                </Typography>
                            </Box>
                            <MenuItem
                                onClick={() => {
                                    setOpenNewAppointment(true);
                                    setAnchorEl(null);
                                }}
                            >
                                <ListItemIcon sx={{ color: "success.main" }}>✓</ListItemIcon>
                                <ListItemText>New Appointment</ListItemText>
                            </MenuItem>
                            <MenuItem
                                onClick={() => {
                                    setOpenTransferIn(true);
                                    setAnchorEl(null);
                                }}
                            >
                                <ListItemIcon sx={{ color: "info.main" }}>→</ListItemIcon>
                                <ListItemText>Transfer In</ListItemText>
                            </MenuItem>
                            <MenuItem
                                onClick={() => {
                                    setOpenTransferOut(true);
                                    setAnchorEl(null);
                                }}
                            >
                                <ListItemIcon sx={{ color: "warning.main" }}>←</ListItemIcon>
                                <ListItemText>Transfer Out</ListItemText>
                            </MenuItem>
                            <MenuItem
                                onClick={() => {
                                    setOpenRetire(true);
                                    setAnchorEl(null);
                                }}
                            >
                                <ListItemIcon>○</ListItemIcon>
                                <ListItemText>Retire / Resign</ListItemText>
                            </MenuItem>
                            <Divider />
                            <Box sx={{ px: 2, py: 1 }}>
                                <Typography variant="caption" sx={{ fontWeight: "bold", color: "text.secondary" }}>
                                    Career Progression
                                </Typography>
                            </Box>
                            <MenuItem
                                onClick={() => {
                                    setOpenPromote(true);
                                    setAnchorEl(null);
                                }}
                            >
                                <ListItemIcon sx={{ color: "success.main" }}>↑</ListItemIcon>
                                <ListItemText>Promote / Update Assignment</ListItemText>
                            </MenuItem>
                            {canMakePermanent && (
                                <MenuItem
                                    onClick={() => {
                                        setOpenMakePermanent(true);
                                        setAnchorEl(null);
                                    }}
                                >
                                    <ListItemIcon sx={{ color: "success.main" }}>✓</ListItemIcon>
                                    <ListItemText>Make Permanent</ListItemText>
                                </MenuItem>
                            )}
                            <Divider />
                            <Box sx={{ px: 2, py: 1 }}>
                                <Typography variant="caption" sx={{ fontWeight: "bold", color: "text.secondary" }}>
                                    System Actions
                                </Typography>
                            </Box>
                            <MenuItem
                                onClick={() => {
                                    setOpenDeath(true);
                                    setAnchorEl(null);
                                }}
                            >
                                <ListItemText>Mark Death</ListItemText>
                            </MenuItem>
                            <MenuItem
                                onClick={() => {
                                    setOpenDismiss(true);
                                    setAnchorEl(null);
                                }}
                            >
                                <ListItemIcon sx={{ color: "error.main" }}>✕</ListItemIcon>
                                <ListItemText>Dismiss</ListItemText>
                            </MenuItem>
                            <MenuItem
                                onClick={() => {
                                    setOpenDelete(true);
                                    setAnchorEl(null);
                                }}
                            >
                                <ListItemIcon sx={{ color: "error.main" }}>🗑</ListItemIcon>
                                <ListItemText sx={{ color: "error.main" }}>Delete Permanently</ListItemText>
                            </MenuItem>
                        </Menu>
                    </Box>
                )}
            </Stack>

            <Paper sx={{ p: 3, mb: 3 }}>
                <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                            NIC
                        </Typography>
                        <Typography>{employee.nic}</Typography>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                            Contact
                        </Typography>
                        <Typography>{employee.contactNo}</Typography>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                            Grade
                        </Typography>
                        <Typography>{employee.grade ?? "—"}</Typography>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                            Service Level
                        </Typography>
                        <Typography>
                            {employee.serviceLevel?.levelName ?? "—"}
                        </Typography>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                            Service
                        </Typography>
                        <Typography>{serviceLabel}</Typography>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                            Working Place
                        </Typography>
                        <Typography>
                            {employee.currentWorkingPlace ?? "—"}
                        </Typography>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                            Incremant Date
                        </Typography>
                        <Typography>
                            {employee.incremantDate ?? "—"}
                        </Typography>
                    </Grid>
                    {employee.transferredFrom && (
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <Typography variant="body2" color="text.secondary">
                                Transferred From
                            </Typography>
                            <Typography>{employee.transferredFrom}</Typography>
                        </Grid>
                    )}
                    <Grid size={{ xs: 12 }}>
                        <Typography variant="body2" color="text.secondary">
                            Permanent Address
                        </Typography>
                        <Typography>
                            {employee.permanentAddress ?? "—"}
                        </Typography>
                    </Grid>
                </Grid>
            </Paper>

            <Paper sx={{ p: 3, mb: 3 }}>
                <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={2}
                    sx={{ justifyContent: "space-between", alignItems: "flex-start" }}
                >
                    <Box>
                        <Typography variant="h6" gutterBottom>
                            Permanent Status
                        </Typography>
                        <PermanentStatusChip status={employee.permanentStatus} />
                    </Box>
                    {canMakePermanent && (
                        <Button
                            variant="contained"
                            onClick={() => setOpenMakePermanent(true)}
                        >
                            Make Permanent
                        </Button>
                    )}
                </Stack>
                <Divider sx={{ my: 2 }} />
                <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                            Employment Type
                        </Typography>
                        <Typography>{employee.employmentType ?? "—"}</Typography>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                            Current Status
                        </Typography>
                        <Typography>
                            {PERMANENT_STATUS_LABELS[employee.permanentStatus] || "Probation"}
                        </Typography>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                            Qualified For Permanent
                        </Typography>
                        <Typography>{employee.qualifiedForPermanent ? "Yes" : "No"}</Typography>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                            Qualification Progress
                        </Typography>
                        <Typography>
                            {employee.qualifiedForPermanent
                                ? "All requirements completed"
                                : "Requirements pending"}
                        </Typography>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                            3 Year Requirement
                        </Typography>
                        <Typography>
                            {threeYearDate ? `Required date: ${formatDate(threeYearDate)}` : "—"}
                        </Typography>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                            Qualification Date
                        </Typography>
                        <Typography>{formatDate(employee.permanentQualificationDate)}</Typography>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                            Permanent Confirmation Date
                        </Typography>
                        <Typography>{formatDate(employee.permanentConfirmationDate)}</Typography>
                    </Grid>
                </Grid>
            </Paper>

            <Typography variant="h6" gutterBottom>
                Lifecycle Action History
            </Typography>
            <EmployeeActionHistoryTable
                actions={actionHistory}
                designations={designations}
                onRefresh={loadProfile}
            />

            <TransferOutDialog
                open={openTransferOut}
                onClose={() => setOpenTransferOut(false)}
                employeeName={employee.fullName}
                onSubmit={(data) =>
                    handleLifecycle(
                        async () => {
                            await transferOutEmployee(employee.id, data);
                            setOpenTransferOut(false);
                        },
                        "Employee transferred out"
                    )
                }
            />

            <PromotionDialog
                open={openPromote}
                onClose={() => setOpenPromote(false)}
                employee={employee}
                onSubmit={(data) => {
                    const isPromotion =
                        data.newDesignationId !== employee.designation?.id;

                    handleLifecycle(
                        async () => {
                            await promoteEmployee(employee.id, data);
                            setOpenPromote(false);
                        },
                        isPromotion
                            ? "Employee promoted"
                            : "Grade and service level updated"
                    );
                }}
            />

            <SimpleLifecycleDialog
                open={openRetire}
                onClose={() => setOpenRetire(false)}
                title="Retirement / Resignation"
                description="Employee will be marked inactive. History is preserved."
                confirmLabel="Confirm Retirement"
                onSubmit={(data) =>
                    handleLifecycle(
                        async () => {
                            await retireEmployee(employee.id, data);
                            setOpenRetire(false);
                        },
                        "Retirement recorded"
                    )
                }
            />

            <SimpleLifecycleDialog
                open={openDeath}
                onClose={() => setOpenDeath(false)}
                title="Record Death"
                description="Employee will be marked inactive. This action is recorded for audit."
                severity="error"
                confirmLabel="Confirm"
                confirmColor="error"
                onSubmit={(data) =>
                    handleLifecycle(
                        async () => {
                            await markEmployeeDeath(employee.id, data);
                            setOpenDeath(false);
                        },
                        "Death recorded"
                    )
                }
            />

            <SimpleLifecycleDialog
                open={openDismiss}
                onClose={() => setOpenDismiss(false)}
                title="Dismiss Employee"
                description="Employee will be marked inactive. Reason is required."
                severity="error"
                confirmLabel="Confirm Dismissal"
                confirmColor="error"
                requireReason
                onSubmit={(data) =>
                    handleLifecycle(
                        async () => {
                            await dismissEmployee(employee.id, data);
                            setOpenDismiss(false);
                        },
                        "Dismissal recorded"
                    )
                }
            />

            <TransferInDialog
                open={openTransferIn}
                onClose={() => setOpenTransferIn(false)}
                employeeName={employee.fullName}
                onSubmit={(data) =>
                    handleLifecycle(
                        async () => {
                            await transferInEmployee(employee.id, data);
                            setOpenTransferIn(false);
                        },
                        "Employee transferred in"
                    )
                }
            />

            <NewAppointmentDialog
                open={openNewAppointment}
                onClose={() => setOpenNewAppointment(false)}
                employeeName={employee.fullName}
                onSubmit={(data) =>
                    handleLifecycle(
                        async () => {
                            await appointNewEmployee(employee.id, data);
                            setOpenNewAppointment(false);
                        },
                        "New appointment recorded"
                    )
                }
            />

            <MakePermanentDialog
                open={openMakePermanent}
                onClose={() => setOpenMakePermanent(false)}
                employeeName={employee.fullName}
                onSubmit={(data) =>
                    handleLifecycle(
                        async () => {
                            await makeEmployeePermanent(employee.id, data);
                            setOpenMakePermanent(false);
                        },
                        "Permanent status confirmed",
                        "Unable to confirm employee as permanent. Please contact administrator."
                    )
                }
            />

            <DeleteEmployeeDialog
                open={openDelete}
                onClose={() => setOpenDelete(false)}
                employeeName={employee.fullName}
                onSubmit={() =>
                    handleLifecycle(
                        async () => {
                            await deleteEmployeePermanently(employee.id);
                            setOpenDelete(false);
                            window.location.href = "/employees";
                        },
                        "Employee deleted permanently"
                    )
                }
            />
        </Box>
    );
}
