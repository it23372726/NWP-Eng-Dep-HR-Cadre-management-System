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
    Tab,
    CircularProgress
} from "@mui/material";
import FileDownloadIcon from "@mui/icons-material/FileDownload";

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import toast from "react-hot-toast";

import { getEmployeeById, saveEmployeePhoto, updateEmployee, getVehiclePermitStatus, recordVehiclePermitCollection, downloadEmployeeSummaryPdf } from "../services/employeeService";
import { triggerDownload } from "../services/allEmployeeDetailsReportService";
import { getDesignations } from "../services/designationService";
import {
    getEmployeeActions,
    transferOutEmployee,
    officeChangeEmployee,
    promoteEmployee,
    retireEmployee,
    markEmployeeDeath,
    dismissEmployee,
    appointNewEmployee,
    makeEmployeePermanent,
    deleteEmployeePermanently
} from "../services/employeeLifecycleService";

import EmployeeStatusChip from "../components/EmployeeStatusChip";
import EmployeeActionHistoryTable from "../components/EmployeeActionHistoryTable";
import EmployeeProfilePersonalTab from "../components/EmployeeProfilePersonalTab";
import RevokePrivateVehicleDialog from "../components/RevokePrivateVehicleDialog";
import RecordVehiclePermitDialog from "../components/RecordVehiclePermitDialog";
import TransferOutDialog from "../components/lifecycle/TransferOutDialog";
import OfficeChangeDialog from "../components/lifecycle/OfficeChangeDialog";
import NewAppointmentDialog from "../components/lifecycle/NewAppointmentDialog";
import PromotionDialog from "../components/lifecycle/PromotionDialog";
import SimpleLifecycleDialog from "../components/lifecycle/SimpleLifecycleDialog";
import MakePermanentDialog from "../components/lifecycle/MakePermanentDialog";
import DeleteEmployeeDialog from "../components/DeleteEmployeeDialog";
import EmployeeForm from "../components/EmployeeForm";
import EmployeeAvatar from "../components/EmployeeAvatar";
import EmployeeQualificationsCard from "../components/EmployeeQualificationsCard";
import EmployeeQualificationsForm from "../components/EmployeeQualificationsForm";
import { getQualificationUpdateContext } from "../utils/employeeQualificationForm";
import {
    getApiErrorMessage,
    isRequirementCompleted
} from "../constants/hrms";
import { getLatestEventDate } from "../utils/timelineDates";
import { buildRevokePrivateVehiclePayload } from "../utils/employeeFormUtils";
import { isSeniorEmployee } from "../utils/vehiclePermit";

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
    const [openOfficeChange, setOpenOfficeChange] = useState(false);
    const [openNewAppointment, setOpenNewAppointment] = useState(false);
    const [openPromote, setOpenPromote] = useState(false);
    const [openRetire, setOpenRetire] = useState(false);
    const [openDeath, setOpenDeath] = useState(false);
    const [openDismiss, setOpenDismiss] = useState(false);
    const [openMakePermanent, setOpenMakePermanent] = useState(false);
    const [openDelete, setOpenDelete] = useState(false);
    const [openEdit, setOpenEdit] = useState(false);
    const [openQualifications, setOpenQualifications] = useState(false);
    const [openRevokePrivateVehicle, setOpenRevokePrivateVehicle] = useState(false);
    const [openRecordVehiclePermit, setOpenRecordVehiclePermit] = useState(false);
    const [savingEmployee, setSavingEmployee] = useState(false);
    const [revokingPrivateVehicle, setRevokingPrivateVehicle] = useState(false);
    const [recordingVehiclePermit, setRecordingVehiclePermit] = useState(false);
    const [vehiclePermitStatus, setVehiclePermitStatus] = useState(null);
    const [anchorEl, setAnchorEl] = useState(null);
    const [activeTab, setActiveTab] = useState(0);
    const [downloadingSummaryPdf, setDownloadingSummaryPdf] = useState(false);

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

            if (isSeniorEmployee(selectedEmployee)) {
                const status = await getVehiclePermitStatus(id);
                setVehiclePermitStatus(status);
            } else {
                setVehiclePermitStatus(null);
            }
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

    const handleDownloadSummaryPdf = async () => {
        if (downloadingSummaryPdf || !employee) {
            return;
        }

        setDownloadingSummaryPdf(true);
        try {
            const blob = await downloadEmployeeSummaryPdf(employee.id);
            const identifier = employee.employeeNo || employee.id;
            triggerDownload(blob, `employee-summary-${identifier}.pdf`);
        } catch (error) {
            toast.error(getApiErrorMessage(error) || "Failed to download summary PDF");
        } finally {
            setDownloadingSummaryPdf(false);
        }
    };

    const handleUpdate = async (data, photoOptions) => {
        if (savingEmployee) {
            return;
        }

        setSavingEmployee(true);
        try {
            await updateEmployee(employee.id, data);
            await saveEmployeePhoto(employee.id, photoOptions);
            toast.success("Employee updated successfully");
            setOpenEdit(false);
            loadProfile();
        } catch (error) {
            toast.error(getApiErrorMessage(error));
        } finally {
            setSavingEmployee(false);
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

    const handleRevokePrivateVehicle = async () => {
        if (revokingPrivateVehicle) {
            return;
        }

        setRevokingPrivateVehicle(true);
        try {
            await updateEmployee(
                employee.id,
                buildRevokePrivateVehiclePayload(employee)
            );
            toast.success("Private vehicle permission removed");
            setOpenRevokePrivateVehicle(false);
            loadProfile();
        } catch (error) {
            toast.error(getApiErrorMessage(error));
        } finally {
            setRevokingPrivateVehicle(false);
        }
    };

    const handleRecordVehiclePermit = async (collectedDate) => {
        if (recordingVehiclePermit) {
            return;
        }

        setRecordingVehiclePermit(true);
        try {
            const status = await recordVehiclePermitCollection(employee.id, collectedDate);
            setVehiclePermitStatus(status);
            toast.success("Vehicle permit collection recorded");
            setOpenRecordVehiclePermit(false);
            loadProfile();
        } catch (error) {
            toast.error(getApiErrorMessage(error));
        } finally {
            setRecordingVehiclePermit(false);
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
    const previousEventDate = getLatestEventDate(actionHistory);
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
                <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                    <EmployeeAvatar employee={employee} />
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
                </Stack>

                <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={
                            downloadingSummaryPdf
                                ? <CircularProgress size={16} color="inherit" />
                                : <FileDownloadIcon />
                        }
                        onClick={handleDownloadSummaryPdf}
                        disabled={downloadingSummaryPdf}
                    >
                        Download Summary PDF
                    </Button>
                    {isActive && (
                        <>
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
                                    setOpenTransferOut(true);
                                    setAnchorEl(null);
                                }}
                            >
                                <ListItemIcon sx={{ color: "warning.main" }}>←</ListItemIcon>
                                <ListItemText>Transfer Out</ListItemText>
                            </MenuItem>
                            <MenuItem
                                onClick={() => {
                                    setOpenOfficeChange(true);
                                    setAnchorEl(null);
                                }}
                            >
                                <ListItemIcon sx={{ color: "info.main" }}>↔</ListItemIcon>
                                <ListItemText>Office Change</ListItemText>
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
                        </>
                    )}
                </Stack>
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
                    onRevokePrivateVehicle={
                        isActive && employee.privateVehicleUsedForGovWork
                            ? () => setOpenRevokePrivateVehicle(true)
                            : null
                    }
                    vehiclePermitStatus={vehiclePermitStatus}
                    onRecordVehiclePermit={
                        isActive && vehiclePermitStatus?.canCollectNow
                            ? () => setOpenRecordVehiclePermit(true)
                            : null
                    }
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
                <EmployeeActionHistoryTable
                    actions={actionHistory}
                    designations={designations}
                    employee={employee}
                    onRefresh={loadProfile}
                />
            )}

            <TransferOutDialog
                open={openTransferOut}
                onClose={() => setOpenTransferOut(false)}
                employeeName={employee.fullName}
                currentDepartment={employee.currentDepartment}
                currentOffice={employee.currentOffice}
                previousEventDate={previousEventDate}
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

            <OfficeChangeDialog
                open={openOfficeChange}
                onClose={() => setOpenOfficeChange(false)}
                employeeName={employee.fullName}
                currentDepartment={employee.currentDepartment}
                currentOffice={employee.currentOffice}
                currentDistrictOfWorking={employee.currentDistrictOfWorking}
                previousEventDate={previousEventDate}
                onSubmit={(data) =>
                    handleLifecycle(
                        async () => {
                            await officeChangeEmployee(employee.id, data);
                            setOpenOfficeChange(false);
                        },
                        "Office updated"
                    )
                }
            />

            <PromotionDialog
                open={openPromote}
                onClose={() => setOpenPromote(false)}
                employee={employee}
                previousEventDate={previousEventDate}
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
                previousEventDate={previousEventDate}
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
                previousEventDate={previousEventDate}
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
                previousEventDate={previousEventDate}
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

            <NewAppointmentDialog
                open={openNewAppointment}
                onClose={() => setOpenNewAppointment(false)}
                employeeName={employee.fullName}
                defaultDepartment={employee.currentDepartment}
                defaultOffice={employee.currentOffice}
                defaultDistrict={employee.currentDistrictOfWorking}
                previousEventDate={previousEventDate}
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
                previousEventDate={previousEventDate}
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
                saving={savingEmployee}
            />

            <EmployeeQualificationsForm
                open={openQualifications}
                handleClose={() => setOpenQualifications(false)}
                handleSubmit={handleQualificationUpdate}
                employee={employee}
            />

            <RevokePrivateVehicleDialog
                open={openRevokePrivateVehicle}
                onClose={() => setOpenRevokePrivateVehicle(false)}
                onConfirm={handleRevokePrivateVehicle}
                employeeName={employee.fullName}
                saving={revokingPrivateVehicle}
            />

            <RecordVehiclePermitDialog
                open={openRecordVehiclePermit}
                onClose={() => setOpenRecordVehiclePermit(false)}
                onConfirm={handleRecordVehiclePermit}
                vehiclePermitStatus={vehiclePermitStatus}
                saving={recordingVehiclePermit}
            />
        </Box>
    );
}
