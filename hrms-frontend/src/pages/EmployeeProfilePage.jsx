import {
    Typography,
    Box,
    Button,
    Stack,
    Divider,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Tabs,
    Tab
} from "@mui/material";

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import toast from "react-hot-toast";

import { getEmployeeById, updateEmployee } from "../services/employeeService";
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
import EmployeeActionHistoryTable from "../components/EmployeeActionHistoryTable";
import EmployeeProfilePersonalTab from "../components/EmployeeProfilePersonalTab";
import TransferOutDialog from "../components/lifecycle/TransferOutDialog";
import TransferInDialog from "../components/lifecycle/TransferInDialog";
import NewAppointmentDialog from "../components/lifecycle/NewAppointmentDialog";
import PromotionDialog from "../components/lifecycle/PromotionDialog";
import SimpleLifecycleDialog from "../components/lifecycle/SimpleLifecycleDialog";
import MakePermanentDialog from "../components/lifecycle/MakePermanentDialog";
import DeleteEmployeeDialog from "../components/DeleteEmployeeDialog";
import EmployeeForm from "../components/EmployeeForm";
import EmployeeQualificationsCard from "../components/EmployeeQualificationsCard";
import EmployeeQualificationsForm from "../components/EmployeeQualificationsForm";
import { getQualificationUpdateContext } from "../utils/employeeQualificationForm";
import {
    getApiErrorMessage,
    isRequirementCompleted
} from "../constants/hrms";

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
        isRequirementCompleted(employee, "EB_GRADE_3")
        && isRequirementCompleted(employee, "GOVERNMENT_LANGUAGE_QUALIFICATION")
        && isRequirementCompleted(employee, "MEDICAL_REPORT")
        && isRequirementCompleted(employee, "OL_CERTIFICATE")
        && isRequirementCompleted(employee, "AL_CERTIFICATE")
        && isRequirementCompleted(employee, "DEGREE_CERTIFICATE")
        && isRequirementCompleted(employee, "BIRTH_CERTIFICATE")
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
    const [openEdit, setOpenEdit] = useState(false);
    const [openQualifications, setOpenQualifications] = useState(false);
    const [anchorEl, setAnchorEl] = useState(null);
    const [activeTab, setActiveTab] = useState(0);

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

    const handleUpdate = async (data) => {
        try {
            await updateEmployee(employee.id, data);
            toast.success("Employee updated successfully");
            setOpenEdit(false);
            loadProfile();
        } catch (error) {
            toast.error(getApiErrorMessage(error));
        }
    };

    const handleQualificationUpdate = async (data) => {
        try {
            await updateEmployee(employee.id, data);
            toast.success("Qualifications updated successfully");
            setOpenQualifications(false);
            loadProfile();
        } catch (error) {
            toast.error(getApiErrorMessage(error));
        }
    };

    if (!employee) {
        return <Typography>Loading...</Typography>;
    }

    const grade2RequiredYears =
        employee.designation?.grade2RequiredYears
        ?? employee.careerProgression?.grade2RequiredYears;
    const grade1RequiredYears =
        employee.designation?.grade1RequiredYears
        ?? employee.careerProgression?.grade1RequiredYears;
    const canMakePermanent =
        meetsGradeThreePermanentRequirements(employee)
        && employee.careerProgression?.qualifiedForPermanent
        && employee.permanentStatus !== "PERMANENT";
    const threeYearDate = getThreeYearRequirementDate(
        employee.dateOfFirstAppointment
    );
    const qualificationContext = getQualificationUpdateContext(employee);
    const canUpdateQualifications =
        isActive && qualificationContext.canUpdate;

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
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={() => setOpenEdit(true)}
                        >
                            Edit Details
                        </Button>
                        {canUpdateQualifications && (
                            <Button
                                variant="outlined"
                                size="small"
                                onClick={() => {
                                    setActiveTab(1);
                                    setOpenQualifications(true);
                                }}
                            >
                                Update Qualifications
                            </Button>
                        )}
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
                    </Stack>
                )}
            </Stack>

            <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
                <Tabs
                    value={activeTab}
                    onChange={(_, value) => setActiveTab(value)}
                    variant="scrollable"
                    scrollButtons="auto"
                >
                    <Tab label="Personal Information" />
                    <Tab label="Qualifications & Requirements" />
                    <Tab label="Lifecycle Action History" />
                </Tabs>
            </Box>

            {activeTab === 0 && (
                <EmployeeProfilePersonalTab
                    employee={employee}
                    grade2RequiredYears={grade2RequiredYears}
                    grade1RequiredYears={grade1RequiredYears}
                    threeYearDate={threeYearDate}
                    canMakePermanent={canMakePermanent}
                    onMakePermanent={() => setOpenMakePermanent(true)}
                />
            )}

            {activeTab === 1 && (
                <EmployeeQualificationsCard
                    employee={employee}
                    embedded
                    onUpdateQualifications={
                        canUpdateQualifications
                            ? () => setOpenQualifications(true)
                            : null
                    }
                />
            )}

            {activeTab === 2 && (
                <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Most recent lifecycle events appear first. Only the latest action
                        can be corrected or removed.
                    </Typography>
                    <EmployeeActionHistoryTable
                        actions={actionHistory}
                        designations={designations}
                        employee={employee}
                        onRefresh={loadProfile}
                    />
                </Box>
            )}

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
                minDate={threeYearDate}
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

            <EmployeeForm
                open={openEdit}
                handleClose={() => setOpenEdit(false)}
                handleSubmit={handleUpdate}
                selectedEmployee={employee}
                actionHistory={actionHistory}
            />

            <EmployeeQualificationsForm
                open={openQualifications}
                handleClose={() => setOpenQualifications(false)}
                handleSubmit={handleQualificationUpdate}
                employee={employee}
            />
        </Box>
    );
}
