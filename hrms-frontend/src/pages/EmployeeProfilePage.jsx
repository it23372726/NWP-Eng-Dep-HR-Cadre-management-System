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
    CircularProgress,
    Alert,
    Chip,
    Paper
} from "@mui/material";
import {
    ArrowBackRounded as ArrowBackIcon,
    BadgeOutlined as BadgeIcon,
    CheckCircleOutlineRounded as ConfirmIcon,
    DeleteForeverOutlined as DeleteIcon,
    EditOutlined as EditIcon,
    ElderlyOutlined as RetireIcon,
    EventAvailableOutlined as BenefitsIcon,
    ExpandMoreRounded as ExpandMoreIcon,
    FileDownloadOutlined as FileDownloadIcon,
    HistoryRounded as HistoryIcon,
    HomeWorkOutlined as WorkplaceIcon,
    LogoutRounded as TransferIcon,
    ManageAccountsOutlined as ActionsIcon,
    PersonOffOutlined as PersonOffIcon,
    ReplayRounded as RevertIcon,
    SchoolOutlined as QualificationsIcon,
    SwapHorizRounded as OfficeChangeIcon,
    TimelineOutlined as TimelineIcon,
    TrendingUpRounded as PromoteIcon,
    WorkOutlineRounded as EmploymentIcon
} from "@mui/icons-material";

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";

import { getEmployeeById, saveEmployeePhoto, updateEmployee, getVehiclePermitStatus, recordVehiclePermitCollection, updateVehiclePermitCollection, undoVehiclePermitCollection, downloadEmployeeSummaryPdf, downloadEmployeeDependentDetailsPdf } from "../services/employeeService";
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
    vacatePostEmployee,
    appointNewEmployee,
    graduateTrainingToPermanent,
    revertTrainingGraduation,
    makeEmployeePermanent,
    deleteEmployeePermanently
} from "../services/employeeLifecycleService";

import EmployeeStatusChip from "../components/EmployeeStatusChip";
import EmployeeActionHistoryTable from "../components/EmployeeActionHistoryTable";
import EmployeeProfilePersonalTab from "../components/EmployeeProfilePersonalTab";
import EmployeeProfileBenefitsTab from "../components/EmployeeProfileBenefitsTab";
import RevokePrivateVehicleDialog from "../components/RevokePrivateVehicleDialog";
import RecordVehiclePermitDialog from "../components/RecordVehiclePermitDialog";
import UndoVehiclePermitDialog from "../components/UndoVehiclePermitDialog";
import RecordSalaryIncrementDialog from "../components/RecordSalaryIncrementDialog";
import UndoSalaryIncrementDialog from "../components/UndoSalaryIncrementDialog";
import TransferOutDialog from "../components/lifecycle/TransferOutDialog";
import OfficeChangeDialog from "../components/lifecycle/OfficeChangeDialog";
import NewAppointmentDialog from "../components/lifecycle/NewAppointmentDialog";
import TrainingAppointmentDialog from "../components/lifecycle/TrainingAppointmentDialog";
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
    canShowDependentDetails,
    getEmployeeServiceRules,
    isContractEmployee,
    isTrainingEmployee,
    isTrainingGraduationEligible,
    getTrainingGraduationBlockReason,
    getEmploymentTypeLabel,
    resolveEmployeeDesignationName,
    resolveEmployeeService,
    isSystemPendingEmployee
} from "../constants/hrms";
import { canEditEmployees } from "../constants/permissions";
import { getStoredUser } from "../hooks/useAuth";
import { normalizeRequiredYears } from "../utils/gradeAchievementDates";
import { getLatestEventDate } from "../utils/timelineDates";
import { buildRevokePrivateVehiclePayload } from "../utils/employeeFormUtils";
import { isNamedRequirementCompleted } from "../utils/employeeQualificationForm";
import { isMarriedStatus } from "../utils/employeeDependentForm";
import { isSeniorEmployee } from "../utils/vehiclePermit";
import {
    getSalaryIncrementStatus,
    recordSalaryIncrement,
    updateSalaryIncrement,
    undoSalaryIncrement
} from "../services/salaryIncrementService";

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

    const service = getEmployeeServiceRules(employee);
    const permanentRequirements = service?.permanentRequirements || [];
    const configuredComplete = permanentRequirements.every((requirement) =>
        isNamedRequirementCompleted(
            employee,
            "CUSTOM_PERMANENT_REQUIREMENT",
            requirement.requirementName
        )
    );

    return configuredComplete
        && hasCompletedThreeYears(employee.dateOfFirstAppointment);
};

function ProfileQuickFact({ icon, label, value }) {
    return (
        <Stack direction="row" spacing={1.1} sx={{ minWidth: 0, alignItems: "center" }}>
            <Box
                sx={{
                    width: 34,
                    height: 34,
                    borderRadius: 2.25,
                    display: "grid",
                    placeItems: "center",
                    bgcolor: "background.paper",
                    color: "primary.main",
                    border: "1px solid",
                    borderColor: "divider",
                    flexShrink: 0,
                    "& svg": { fontSize: 18 }
                }}
            >
                {icon}
            </Box>
            <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                    {label}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                    {value || "—"}
                </Typography>
            </Box>
        </Stack>
    );
}

export default function EmployeeProfilePage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const canEdit = canEditEmployees(getStoredUser());

    const [employee, setEmployee] = useState(null);
    const [actionHistory, setActionHistory] = useState([]);
    const [designations, setDesignations] = useState([]);
    const [openTransferOut, setOpenTransferOut] = useState(false);
    const [openOfficeChange, setOpenOfficeChange] = useState(false);
    const [openNewAppointment, setOpenNewAppointment] = useState(false);
    const [openTrainingAppointment, setOpenTrainingAppointment] = useState(false);
    const [openRevertTraining, setOpenRevertTraining] = useState(false);
    const [openPromote, setOpenPromote] = useState(false);
    const [openRetire, setOpenRetire] = useState(false);
    const [openDeath, setOpenDeath] = useState(false);
    const [openDismiss, setOpenDismiss] = useState(false);
    const [openVacationOfPost, setOpenVacationOfPost] = useState(false);
    const [openMakePermanent, setOpenMakePermanent] = useState(false);
    const [openDelete, setOpenDelete] = useState(false);
    const [openEdit, setOpenEdit] = useState(false);
    const [openQualifications, setOpenQualifications] = useState(false);
    const [openRevokePrivateVehicle, setOpenRevokePrivateVehicle] = useState(false);
    const [openRecordVehiclePermit, setOpenRecordVehiclePermit] = useState(false);
    const [openEditVehiclePermit, setOpenEditVehiclePermit] = useState(false);
    const [openUndoVehiclePermit, setOpenUndoVehiclePermit] = useState(false);
    const [openRecordSalaryIncrement, setOpenRecordSalaryIncrement] = useState(false);
    const [openEditSalaryIncrement, setOpenEditSalaryIncrement] = useState(false);
    const [openUndoSalaryIncrement, setOpenUndoSalaryIncrement] = useState(false);
    const [savingEmployee, setSavingEmployee] = useState(false);
    const [revokingPrivateVehicle, setRevokingPrivateVehicle] = useState(false);
    const [recordingVehiclePermit, setRecordingVehiclePermit] = useState(false);
    const [undoingVehiclePermit, setUndoingVehiclePermit] = useState(false);
    const [recordingSalaryIncrement, setRecordingSalaryIncrement] = useState(false);
    const [undoingSalaryIncrement, setUndoingSalaryIncrement] = useState(false);
    const [vehiclePermitStatus, setVehiclePermitStatus] = useState(null);
    const [salaryIncrementStatus, setSalaryIncrementStatus] = useState(null);
    const [anchorEl, setAnchorEl] = useState(null);
    const [activeTab, setActiveTab] = useState(0);
    const [downloadingSummaryPdf, setDownloadingSummaryPdf] = useState(false);
    const [downloadingDependentDetailsPdf, setDownloadingDependentDetailsPdf] = useState(false);

    const isActive = employee?.status === "ACTIVE";
    const isContract = isContractEmployee(employee?.employmentType);
    const isTraining = isTrainingEmployee(employee);
    const isSimplifiedLifecycle = isContract || isTraining;
    const isSystemPending = isSystemPendingEmployee(employee, actionHistory);
    const showLifecycleHistoryTab =
        !isSystemPending && (isTraining || !isSimplifiedLifecycle);
    const canAppointTrainingAsPermanent = isTrainingGraduationEligible(employee);

    useEffect(() => {
        loadProfile();
        setActiveTab(0);
    }, [id]);

    const loadProfile = async () => {
        try {
            // Load employee first: GET /employees/{id} syncs/saves on the backend.
            // Parallel /actions used to call the same write path and race → 400 on first open.
            const selectedEmployee = await getEmployeeById(id);
            const actions = await getEmployeeActions(id);

            setEmployee(selectedEmployee);
            setActionHistory(actions);

            try {
                const designationsData = await getDesignations();
                setDesignations(designationsData);
            } catch {
                setDesignations([]);
            }

            if (isSeniorEmployee(selectedEmployee)) {
                const status = await getVehiclePermitStatus(id);
                setVehiclePermitStatus(status);
            } else {
                setVehiclePermitStatus(null);
            }

            if (!isContractEmployee(selectedEmployee.employmentType)
                && selectedEmployee.incremantDate) {
                const incrementStatus = await getSalaryIncrementStatus(id);
                setSalaryIncrementStatus(incrementStatus);
            } else {
                setSalaryIncrementStatus(null);
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
            triggerDownload(blob, `employment-summary-${identifier}.pdf`);
        } catch (error) {
            toast.error(getApiErrorMessage(error) || "Failed to download employment summary PDF");
        } finally {
            setDownloadingSummaryPdf(false);
        }
    };

    const handleDownloadDependentDetailsPdf = async () => {
        if (downloadingDependentDetailsPdf || !employee) {
            return;
        }

        setDownloadingDependentDetailsPdf(true);
        try {
            const blob = await downloadEmployeeDependentDetailsPdf(employee.id);
            const identifier = employee.employeeNo || employee.id;
            triggerDownload(blob, `dependent-details-${identifier}.pdf`);
        } catch (error) {
            toast.error(getApiErrorMessage(error) || "Failed to download dependent details PDF");
        } finally {
            setDownloadingDependentDetailsPdf(false);
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

    const handleEditVehiclePermit = async (collectedDate) => {
        if (recordingVehiclePermit) {
            return;
        }

        setRecordingVehiclePermit(true);
        try {
            const status = await updateVehiclePermitCollection(employee.id, collectedDate);
            setVehiclePermitStatus(status);
            toast.success("Vehicle permit collection updated");
            setOpenEditVehiclePermit(false);
            loadProfile();
        } catch (error) {
            toast.error(getApiErrorMessage(error));
        } finally {
            setRecordingVehiclePermit(false);
        }
    };

    const handleUndoVehiclePermit = async () => {
        if (undoingVehiclePermit) {
            return;
        }

        setUndoingVehiclePermit(true);
        try {
            const status = await undoVehiclePermitCollection(employee.id);
            setVehiclePermitStatus(status);
            toast.success("Vehicle permit collection undone");
            setOpenUndoVehiclePermit(false);
            loadProfile();
        } catch (error) {
            toast.error(getApiErrorMessage(error));
        } finally {
            setUndoingVehiclePermit(false);
        }
    };

    const handleRecordSalaryIncrement = async (doneDate, { catchUpToCurrentYear = false } = {}) => {
        if (recordingSalaryIncrement) {
            return;
        }

        setRecordingSalaryIncrement(true);
        try {
            const status = await recordSalaryIncrement(employee.id, doneDate, {
                catchUpToCurrentYear
            });
            setSalaryIncrementStatus(status);
            toast.success(
                catchUpToCurrentYear
                    ? "Salary increments caught up through current year"
                    : "Salary increment recorded"
            );
            setOpenRecordSalaryIncrement(false);
            loadProfile();
        } catch (error) {
            toast.error(getApiErrorMessage(error));
        } finally {
            setRecordingSalaryIncrement(false);
        }
    };

    const handleEditSalaryIncrement = async (doneDate) => {
        if (recordingSalaryIncrement) {
            return;
        }

        setRecordingSalaryIncrement(true);
        try {
            const status = await updateSalaryIncrement(employee.id, doneDate);
            setSalaryIncrementStatus(status);
            toast.success("Salary increment date updated");
            setOpenEditSalaryIncrement(false);
            loadProfile();
        } catch (error) {
            toast.error(getApiErrorMessage(error));
        } finally {
            setRecordingSalaryIncrement(false);
        }
    };

    const handleUndoSalaryIncrement = async () => {
        if (undoingSalaryIncrement) {
            return;
        }

        setUndoingSalaryIncrement(true);
        try {
            const status = await undoSalaryIncrement(employee.id);
            setSalaryIncrementStatus(status);
            toast.success("Salary increment undone");
            setOpenUndoSalaryIncrement(false);
            loadProfile();
        } catch (error) {
            toast.error(getApiErrorMessage(error));
        } finally {
            setUndoingSalaryIncrement(false);
        }
    };

    if (!employee) {
        return (
            <Paper
                variant="outlined"
                sx={{ minHeight: 320, display: "grid", placeItems: "center" }}
            >
                <Stack spacing={1.5} sx={{ alignItems: "center" }}>
                    <CircularProgress size={34} />
                    <Typography variant="body2" color="text.secondary">
                        Loading employee profile…
                    </Typography>
                </Stack>
            </Paper>
        );
    }

    const employeeService = resolveEmployeeService(employee);
    const grade2RequiredYears = normalizeRequiredYears(
        employeeService?.grade2RequiredYears
        ?? employee.careerProgression?.grade2RequiredYears
    );
    const grade1RequiredYears = normalizeRequiredYears(
        employeeService?.grade1RequiredYears
        ?? employee.careerProgression?.grade1RequiredYears
    );
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
    const qualificationsActionLabel = qualificationContext.canSave
        ? "Update Qualifications"
        : "View Qualifications";

    return (
        <Box>
            <Button
                size="small"
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate("/employees")}
                sx={{ mb: 1.25, color: "text.secondary" }}
            >
                Back to employees
            </Button>
            <Paper
                variant="outlined"
                sx={{
                    p: { xs: 2, sm: 2.5 },
                    mb: 2.5,
                    overflow: "hidden",
                    position: "relative",
                    background: (theme) =>
                        `linear-gradient(125deg, ${theme.palette.background.paper} 35%, ${theme.palette.primary[50]} 100%)`,
                    "&::after": {
                        content: '""',
                        position: "absolute",
                        width: 220,
                        height: 220,
                        borderRadius: "50%",
                        right: -100,
                        top: -145,
                        bgcolor: "primary.100",
                        opacity: 0.45
                    }
                }}
            >
            <Stack
                direction={{ xs: "column", sm: "row" }}
                sx={{
                    position: "relative",
                    zIndex: 1,
                    justifyContent: "space-between",
                    alignItems: { xs: "stretch", sm: "center" },
                    flexWrap: "wrap",
                    gap: 2
                }}
            >
                <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                    <Box
                        sx={{
                            p: 0.5,
                            borderRadius: "50%",
                            bgcolor: "background.paper",
                            border: "1px solid",
                            borderColor: "primary.100",
                            boxShadow: 2,
                            flexShrink: 0
                        }}
                    >
                        <EmployeeAvatar employee={employee} size={76} />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                        <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={1}
                            sx={{ alignItems: { xs: "flex-start", sm: "center" } }}
                        >
                            <Typography variant="h4" sx={{ overflowWrap: "anywhere" }}>
                                {employee.fullName}
                            </Typography>
                            <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: "wrap" }}>
                                <EmployeeStatusChip status={employee.status} />
                                {isSystemPending && (
                                    <Chip
                                        label="System Pending"
                                        size="small"
                                        color="warning"
                                        variant="outlined"
                                    />
                                )}
                            </Stack>
                        </Stack>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            {isSystemPending
                                ? `${employee.employeeNo} · Career history not recorded`
                                : `${employee.employeeNo} · ${resolveEmployeeDesignationName(employee)}`}
                        </Typography>
                    </Box>
                </Stack>

                <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    sx={{
                        flexWrap: "wrap",
                        alignItems: { xs: "stretch", sm: "center" },
                        "& .MuiButton-root": { justifyContent: { xs: "flex-start", sm: "center" } }
                    }}
                >
                    {!isSimplifiedLifecycle && !isSystemPending && (
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
                        Employment Summary PDF
                    </Button>
                    )}
                    {canShowDependentDetails(employee)
                        && isMarriedStatus(employee.maritalStatus) && (
                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={
                                downloadingDependentDetailsPdf
                                    ? <CircularProgress size={16} color="inherit" />
                                    : <FileDownloadIcon />
                            }
                            onClick={handleDownloadDependentDetailsPdf}
                            disabled={downloadingDependentDetailsPdf}
                        >
                            Dependent Details PDF
                        </Button>
                    )}
                    {isActive && canEdit && (
                        <>
                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={<EditIcon />}
                            onClick={() => setOpenEdit(true)}
                        >
                            Edit Details
                        </Button>
                        {canUpdateQualifications && !isSystemPending && (
                            <Button
                                variant="outlined"
                                size="small"
                                startIcon={<QualificationsIcon />}
                                onClick={() => {
                                    setActiveTab(isContract ? 1 : 2);
                                    setOpenQualifications(true);
                                }}
                            >
                                {qualificationsActionLabel}
                            </Button>
                        )}
                        {!isSystemPending && (
                        <Button
                            variant="contained"
                            size="small"
                            startIcon={<ActionsIcon />}
                            endIcon={<ExpandMoreIcon />}
                            onClick={(e) => setAnchorEl(e.currentTarget)}
                        >
                            Employee Actions
                        </Button>
                        )}
                        {isSystemPending && (
                            <Button
                                variant="outlined"
                                size="small"
                                color="error"
                                startIcon={<DeleteIcon />}
                                onClick={() => setOpenDelete(true)}
                            >
                                Delete Permanently
                            </Button>
                        )}
                        {!isSystemPending && (
                        <Menu
                            anchorEl={anchorEl}
                            open={Boolean(anchorEl)}
                            onClose={() => setAnchorEl(null)}
                            slotProps={{
                                paper: { sx: { minWidth: 270, maxHeight: 520 } }
                            }}
                        >
                            {isTraining && (
                            <>
                            <Box sx={{ px: 2, py: 1 }}>
                                <Typography variant="caption" sx={{ fontWeight: "bold", color: "text.secondary" }}>
                                    Employment Actions
                                </Typography>
                            </Box>
                            <MenuItem
                                onClick={() => {
                                    if (!canAppointTrainingAsPermanent) {
                                        toast.error(
                                            getTrainingGraduationBlockReason(employee)
                                                || "Training graduation requirements are not satisfied"
                                        );
                                        setAnchorEl(null);
                                        return;
                                    }
                                    setOpenTrainingAppointment(true);
                                    setAnchorEl(null);
                                }}
                                disabled={!canAppointTrainingAsPermanent}
                            >
                                <ListItemIcon sx={{ color: "success.main" }}><ConfirmIcon fontSize="small" /></ListItemIcon>
                                <ListItemText>Appoint as Permanent</ListItemText>
                            </MenuItem>
                            <Divider />
                            </>
                            )}
                            {employee?.canRevertTrainingGraduation && (
                            <>
                            <Box sx={{ px: 2, py: 1 }}>
                                <Typography variant="caption" sx={{ fontWeight: "bold", color: "text.secondary" }}>
                                    Training Reversal
                                </Typography>
                            </Box>
                            <MenuItem
                                onClick={() => {
                                    setOpenRevertTraining(true);
                                    setAnchorEl(null);
                                }}
                            >
                                <ListItemIcon sx={{ color: "warning.main" }}><RevertIcon fontSize="small" /></ListItemIcon>
                                <ListItemText>Revert to Training</ListItemText>
                            </MenuItem>
                            <Divider />
                            </>
                            )}
                            {!isSimplifiedLifecycle && (
                            <>
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
                                <ListItemIcon sx={{ color: "success.main" }}><ConfirmIcon fontSize="small" /></ListItemIcon>
                                <ListItemText>New Appointment</ListItemText>
                            </MenuItem>
                            <MenuItem
                                onClick={() => {
                                    setOpenTransferOut(true);
                                    setAnchorEl(null);
                                }}
                            >
                                <ListItemIcon sx={{ color: "warning.main" }}><TransferIcon fontSize="small" /></ListItemIcon>
                                <ListItemText>Transfer Out</ListItemText>
                            </MenuItem>
                            <MenuItem
                                onClick={() => {
                                    setOpenOfficeChange(true);
                                    setAnchorEl(null);
                                }}
                            >
                                <ListItemIcon sx={{ color: "info.main" }}><OfficeChangeIcon fontSize="small" /></ListItemIcon>
                                <ListItemText>Office Change</ListItemText>
                            </MenuItem>
                            <MenuItem
                                onClick={() => {
                                    setOpenRetire(true);
                                    setAnchorEl(null);
                                }}
                            >
                                <ListItemIcon><RetireIcon fontSize="small" /></ListItemIcon>
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
                                <ListItemIcon sx={{ color: "success.main" }}><PromoteIcon fontSize="small" /></ListItemIcon>
                                <ListItemText>Promote / Update Assignment</ListItemText>
                            </MenuItem>
                            {canMakePermanent && (
                                <MenuItem
                                    onClick={() => {
                                        setOpenMakePermanent(true);
                                        setAnchorEl(null);
                                    }}
                                >
                                    <ListItemIcon sx={{ color: "success.main" }}><ConfirmIcon fontSize="small" /></ListItemIcon>
                                    <ListItemText>Make Permanent</ListItemText>
                                </MenuItem>
                            )}
                            <Divider />
                            </>
                            )}
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
                                <ListItemIcon><PersonOffIcon fontSize="small" /></ListItemIcon>
                                <ListItemText>Mark Death</ListItemText>
                            </MenuItem>
                            <MenuItem
                                onClick={() => {
                                    setOpenDismiss(true);
                                    setAnchorEl(null);
                                }}
                            >
                                <ListItemIcon sx={{ color: "error.main" }}><PersonOffIcon fontSize="small" /></ListItemIcon>
                                <ListItemText>Dismiss</ListItemText>
                            </MenuItem>
                            <MenuItem
                                onClick={() => {
                                    setOpenVacationOfPost(true);
                                    setAnchorEl(null);
                                }}
                            >
                                <ListItemIcon sx={{ color: "error.main" }}><PersonOffIcon fontSize="small" /></ListItemIcon>
                                <ListItemText>Vacation of Post</ListItemText>
                            </MenuItem>
                            <MenuItem
                                onClick={() => {
                                    setOpenDelete(true);
                                    setAnchorEl(null);
                                }}
                            >
                                <ListItemIcon sx={{ color: "error.main" }}><DeleteIcon fontSize="small" /></ListItemIcon>
                                <ListItemText sx={{ color: "error.main" }}>Delete Permanently</ListItemText>
                            </MenuItem>
                        </Menu>
                        )}
                        </>
                    )}
                </Stack>
            </Stack>

            <Box
                sx={{
                    position: "relative",
                    zIndex: 1,
                    mt: 2.5,
                    pt: 2,
                    borderTop: "1px solid",
                    borderColor: "divider",
                    display: "grid",
                    gridTemplateColumns: {
                        xs: "repeat(2, minmax(0, 1fr))",
                        md: "repeat(4, minmax(0, 1fr))"
                    },
                    gap: 1.5
                }}
            >
                <ProfileQuickFact
                    icon={<EmploymentIcon />}
                    label="Employment"
                    value={getEmploymentTypeLabel(employee.employmentType, employee)}
                />
                <ProfileQuickFact
                    icon={<BadgeIcon />}
                    label="Current grade"
                    value={isContract || isTraining ? "Not graded" : employee.grade}
                />
                <ProfileQuickFact
                    icon={<WorkplaceIcon />}
                    label="Current workplace"
                    value={employee.currentOffice || employee.currentDepartment}
                />
                <ProfileQuickFact
                    icon={<TimelineIcon />}
                    label="Service level"
                    value={employee.serviceLevel?.levelName || employeeService?.serviceCode}
                />
            </Box>
            </Paper>

            {isSystemPending && canEdit && (
                <Alert severity="info" sx={{ mb: 3 }}>
                    Career history has not been recorded yet. Use Edit Details to add the
                    employee&apos;s first appointment and complete their profile.
                </Alert>
            )}
            {isSystemPending && !canEdit && (
                <Alert severity="info" sx={{ mb: 3 }}>
                    Career history has not been recorded yet for this employee.
                </Alert>
            )}

            <Paper
                variant="outlined"
                sx={{
                    mb: 2.5,
                    px: { xs: 0.5, sm: 1 },
                    overflow: "hidden",
                    position: { md: "sticky" },
                    top: { md: 72 },
                    zIndex: 4,
                    bgcolor: (theme) => theme.palette.background.paper
                }}
            >
                <Tabs
                    value={activeTab}
                    onChange={(_, value) => setActiveTab(value)}
                    variant="scrollable"
                    scrollButtons="auto"
                    aria-label="Employee profile sections"
                >
                    <Tab
                        icon={<BadgeIcon fontSize="small" />}
                        iconPosition="start"
                        label="Profile overview"
                    />
                    {!isSystemPending && (
                        <Tab
                            icon={<BenefitsIcon fontSize="small" />}
                            iconPosition="start"
                            label="Benefits & allowances"
                        />
                    )}
                    {!isSystemPending && !isContract && (
                        <Tab
                            icon={<QualificationsIcon fontSize="small" />}
                            iconPosition="start"
                            label="Qualifications"
                        />
                    )}
                    {showLifecycleHistoryTab && (
                        <Tab
                            icon={<HistoryIcon fontSize="small" />}
                            iconPosition="start"
                            label="Lifecycle history"
                        />
                    )}
                </Tabs>
            </Paper>

            {activeTab === 0 && (
                <EmployeeProfilePersonalTab
                    employee={employee}
                    grade2RequiredYears={grade2RequiredYears}
                    grade1RequiredYears={grade1RequiredYears}
                    threeYearDate={threeYearDate}
                    canMakePermanent={canEdit && canMakePermanent}
                    onMakePermanent={
                        canEdit ? () => setOpenMakePermanent(true) : null
                    }
                    isSystemPending={isSystemPending}
                />
            )}

            {!isSystemPending && activeTab === 1 && (
                <EmployeeProfileBenefitsTab
                    employee={employee}
                    onRevokePrivateVehicle={
                        canEdit && isActive && employee.privateVehicleUsedForGovWork
                            ? () => setOpenRevokePrivateVehicle(true)
                            : null
                    }
                    vehiclePermitStatus={vehiclePermitStatus}
                    onRecordVehiclePermit={
                        canEdit && isActive && vehiclePermitStatus?.canCollectNow
                            ? () => setOpenRecordVehiclePermit(true)
                            : null
                    }
                    onEditVehiclePermit={
                        canEdit && isActive && (vehiclePermitStatus?.lastCollectedDate
                            ?? employee.vehiclePermitCollectedDate)
                            ? () => setOpenEditVehiclePermit(true)
                            : null
                    }
                    onUndoVehiclePermit={
                        canEdit && isActive && (vehiclePermitStatus?.lastCollectedDate
                            ?? employee.vehiclePermitCollectedDate)
                            ? () => setOpenUndoVehiclePermit(true)
                            : null
                    }
                    salaryIncrementStatus={salaryIncrementStatus}
                    onRecordSalaryIncrement={
                        canEdit && isActive && salaryIncrementStatus?.canRecordNow
                            ? () => setOpenRecordSalaryIncrement(true)
                            : null
                    }
                    onEditSalaryIncrement={
                        canEdit && isActive && (salaryIncrementStatus?.lastDoneDate
                            ?? employee.salaryIncrementDoneDate)
                            ? () => setOpenEditSalaryIncrement(true)
                            : null
                    }
                    onUndoSalaryIncrement={
                        canEdit && isActive && (salaryIncrementStatus?.lastDoneDate
                            ?? employee.salaryIncrementDoneDate)
                            ? () => setOpenUndoSalaryIncrement(true)
                            : null
                    }
                />
            )}

            {activeTab === 2 && !isContract && !isSystemPending && (
                <EmployeeQualificationsCard
                    employee={employee}
                    embedded
                    onUpdateQualifications={
                        canEdit && canUpdateQualifications
                            ? () => setOpenQualifications(true)
                            : null
                    }
                    qualificationsActionLabel={qualificationsActionLabel}
                />
            )}

            {activeTab === 3 && showLifecycleHistoryTab && (
                <EmployeeActionHistoryTable
                    actions={actionHistory}
                    designations={designations}
                    employee={employee}
                    onRefresh={loadProfile}
                    canEdit={canEdit}
                />
            )}

            <TransferOutDialog
                open={openTransferOut}
                onClose={() => setOpenTransferOut(false)}
                employee={employee}
                employeeName={employee.fullName}
                currentDepartment={employee.currentDepartment}
                currentOffice={employee.currentOffice}
                currentDistrictOfWorking={employee.currentDistrictOfWorking}
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

            <SimpleLifecycleDialog
                open={openVacationOfPost}
                onClose={() => setOpenVacationOfPost(false)}
                title="Vacation of Post"
                description="Employee will be marked inactive for absence without notifying Council. Reason is required."
                severity="error"
                confirmLabel="Confirm Vacation of Post"
                confirmColor="error"
                requireReason
                previousEventDate={previousEventDate}
                onSubmit={(data) =>
                    handleLifecycle(
                        async () => {
                            await vacatePostEmployee(employee.id, data);
                            setOpenVacationOfPost(false);
                        },
                        "Vacation of post recorded"
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

            <TrainingAppointmentDialog
                open={openTrainingAppointment}
                onClose={() => setOpenTrainingAppointment(false)}
                employee={employee}
                previousEventDate={previousEventDate}
                canAppoint={canAppointTrainingAsPermanent}
                onSubmit={(data) =>
                    handleLifecycle(
                        async () => {
                            await graduateTrainingToPermanent(employee.id, data);
                            setOpenTrainingAppointment(false);
                        },
                        "Training employee appointed as permanent"
                    )
                }
            />

            <SimpleLifecycleDialog
                open={openRevertTraining}
                onClose={() => setOpenRevertTraining(false)}
                title="Revert to Training"
                description="This will undo the training-to-permanent appointment and restore the employee as a training employee. This is only available when no other lifecycle actions were recorded after that appointment."
                severity="warning"
                confirmLabel="Revert to Training"
                confirmColor="warning"
                hideDateField
                onSubmit={() =>
                    handleLifecycle(
                        async () => {
                            await revertTrainingGraduation(employee.id);
                            setOpenRevertTraining(false);
                        },
                        "Employee reverted to training status"
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

            <RecordVehiclePermitDialog
                open={openEditVehiclePermit}
                onClose={() => setOpenEditVehiclePermit(false)}
                onConfirm={handleEditVehiclePermit}
                vehiclePermitStatus={vehiclePermitStatus}
                saving={recordingVehiclePermit}
                mode="edit"
            />

            <UndoVehiclePermitDialog
                open={openUndoVehiclePermit}
                onClose={() => setOpenUndoVehiclePermit(false)}
                onConfirm={handleUndoVehiclePermit}
                lastCollectedDate={
                    vehiclePermitStatus?.lastCollectedDate
                    ?? employee.vehiclePermitCollectedDate
                }
                saving={undoingVehiclePermit}
            />

            <RecordSalaryIncrementDialog
                open={openRecordSalaryIncrement}
                onClose={() => setOpenRecordSalaryIncrement(false)}
                onConfirm={handleRecordSalaryIncrement}
                salaryIncrementStatus={salaryIncrementStatus}
                employee={employee}
                saving={recordingSalaryIncrement}
            />

            <RecordSalaryIncrementDialog
                open={openEditSalaryIncrement}
                onClose={() => setOpenEditSalaryIncrement(false)}
                onConfirm={handleEditSalaryIncrement}
                salaryIncrementStatus={salaryIncrementStatus}
                employee={employee}
                saving={recordingSalaryIncrement}
                mode="edit"
            />

            <UndoSalaryIncrementDialog
                open={openUndoSalaryIncrement}
                onClose={() => setOpenUndoSalaryIncrement(false)}
                onConfirm={handleUndoSalaryIncrement}
                lastDoneDate={
                    salaryIncrementStatus?.lastDoneDate
                    ?? employee.salaryIncrementDoneDate
                }
                lastDueYear={
                    salaryIncrementStatus?.lastDueYear
                    ?? employee.salaryIncrementLastDueYear
                }
                salaryIncrementStatus={salaryIncrementStatus}
                saving={undoingSalaryIncrement}
            />
        </Box>
    );
}
