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
    isContractEmployee,
    isRequirementCompleted,
    isTrainingEmployee,
    isTrainingGraduationEligible,
    getTrainingGraduationBlockReason,
    resolveEmployeeDesignationName,
    resolveEmployeeService
} from "../constants/hrms";
import { normalizeRequiredYears } from "../utils/gradeAchievementDates";
import { getLatestEventDate } from "../utils/timelineDates";
import { buildRevokePrivateVehiclePayload } from "../utils/employeeFormUtils";
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
    const canAppointTrainingAsPermanent = isTrainingGraduationEligible(employee);

    useEffect(() => {
        loadProfile();
        setActiveTab(0);
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
        return <Typography>Loading...</Typography>;
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
                            {employee.employeeNo} · {resolveEmployeeDesignationName(employee)}
                        </Typography>
                    </Box>
                </Stack>

                <Stack direction="row" spacing={1} flexWrap="wrap">
                    {!isSimplifiedLifecycle && (
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
                                    setActiveTab(isContract ? 1 : 2);
                                    setOpenQualifications(true);
                                }}
                            >
                                {qualificationsActionLabel}
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
                                <ListItemIcon sx={{ color: "success.main" }}>✓</ListItemIcon>
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
                                <ListItemIcon sx={{ color: "warning.main" }}>↩</ListItemIcon>
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
                                    setOpenVacationOfPost(true);
                                    setAnchorEl(null);
                                }}
                            >
                                <ListItemIcon sx={{ color: "error.main" }}>✕</ListItemIcon>
                                <ListItemText>Vacation of Post</ListItemText>
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
                    <Tab label="Employee's Information" />
                    <Tab label="Benefits & Allowances" />
                    {!isContract && (
                        <Tab label="Qualifications & Requirements" />
                    )}
                    {!isSimplifiedLifecycle && (
                        <Tab label="Lifecycle Action History" />
                    )}
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
                <EmployeeProfileBenefitsTab
                    employee={employee}
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
                    onEditVehiclePermit={
                        isActive && (vehiclePermitStatus?.lastCollectedDate
                            ?? employee.vehiclePermitCollectedDate)
                            ? () => setOpenEditVehiclePermit(true)
                            : null
                    }
                    onUndoVehiclePermit={
                        isActive && (vehiclePermitStatus?.lastCollectedDate
                            ?? employee.vehiclePermitCollectedDate)
                            ? () => setOpenUndoVehiclePermit(true)
                            : null
                    }
                    salaryIncrementStatus={salaryIncrementStatus}
                    onRecordSalaryIncrement={
                        isActive && salaryIncrementStatus?.canRecordNow
                            ? () => setOpenRecordSalaryIncrement(true)
                            : null
                    }
                    onEditSalaryIncrement={
                        isActive && (salaryIncrementStatus?.lastDoneDate
                            ?? employee.salaryIncrementDoneDate)
                            ? () => setOpenEditSalaryIncrement(true)
                            : null
                    }
                    onUndoSalaryIncrement={
                        isActive && (salaryIncrementStatus?.lastDoneDate
                            ?? employee.salaryIncrementDoneDate)
                            ? () => setOpenUndoSalaryIncrement(true)
                            : null
                    }
                />
            )}

            {activeTab === 2 && !isContract && (
                <EmployeeQualificationsCard
                    employee={employee}
                    embedded
                    onUpdateQualifications={
                        canUpdateQualifications
                            ? () => setOpenQualifications(true)
                            : null
                    }
                    qualificationsActionLabel={qualificationsActionLabel}
                />
            )}

            {activeTab === 3 && !isSimplifiedLifecycle && (
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
