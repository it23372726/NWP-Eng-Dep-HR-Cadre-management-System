import {
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Paper,
    Stack,
    Tooltip,
    Typography
} from "@mui/material";
import {
    DeleteOutlineRounded as DeleteIcon,
    EditRounded as EditIcon,
    EventNoteRounded as EventIcon,
    HistoryRounded as HistoryIcon
} from "@mui/icons-material";
import { useState } from "react";
import toast from "react-hot-toast";

import {
    ACTION_TYPE_LABELS,
    getActionDetailLines,
    getActionTypeLabel,
    getApiErrorMessage,
    getEmployeeServiceRules
} from "../constants/hrms";
import {
    deleteEmployeeAction,
    updateEmployeeAction
} from "../services/employeeLifecycleService";
import ServiceAppointmentDialog from "./lifecycle/ServiceAppointmentDialog";
import ServiceAppointmentHistory from "./ServiceAppointmentHistory";
import OfficeChangeDialog from "./lifecycle/OfficeChangeDialog";
import PromotionDialog from "./lifecycle/PromotionDialog";
import TransferOutDialog from "./lifecycle/TransferOutDialog";
import TransferInDialog from "./lifecycle/TransferInDialog";
import NewAppointmentDialog from "./lifecycle/NewAppointmentDialog";
import TrainingAppointmentDialog from "./lifecycle/TrainingAppointmentDialog";
import MakePermanentDialog from "./lifecycle/MakePermanentDialog";
import SimpleLifecycleDialog from "./lifecycle/SimpleLifecycleDialog";
import { getPreviousEventDateForEdit, getNextEventDateForEdit } from "../utils/timelineDates";
import { getPermanentConfirmationMinDate } from "../utils/gradeAchievementDates";
import { getLifecycleEditDateBounds } from "../utils/lifecycleEditBounds";
import { EmployeeProfileEmptyState } from "./EmployeeProfileSection";

const actionColor = {
    NEW_APPOINTMENT: "primary",
    SERVICE_APPOINTMENT: "info",
    TRANSFER_IN: "info",
    TRANSFER_OUT: "warning",
    OFFICE_CHANGE: "info",
    PROMOTION: "success",
    ASSIGNMENT_GRADE_UPDATE: "info",
    PERMANENT_CONFIRMATION: "success",
    RETIREMENT_OR_RESIGNATION: "default",
    DEATH: "default",
    DISMISSAL: "error",
    VACATION_OF_POST: "error"
};

const EXIT_ACTION_META = {
    RETIREMENT_OR_RESIGNATION: {
        title: "Edit Retirement / Resignation",
        description: "Revise the retirement or resignation date and remarks.",
        severity: "info",
        requireReason: false
    },
    DEATH: {
        title: "Edit Death Record",
        description: "Revise the recorded date of death and remarks.",
        severity: "error",
        requireReason: false
    },
    DISMISSAL: {
        title: "Edit Dismissal",
        description: "Revise the dismissal date, reason, and remarks.",
        severity: "error",
        requireReason: true
    },
    VACATION_OF_POST: {
        title: "Edit Vacation of Post",
        description: "Revise the vacation-of-post date, reason, and remarks.",
        severity: "warning",
        requireReason: true
    }
};

const formatDisplayDate = (date) =>
    date
        ? new Date(`${date}T00:00:00`).toLocaleDateString("en-GB")
        : "—";

function filterVisibleActions(actions) {
    return (actions ?? []).filter(
        (action) => !(action.actionType === "TRANSFER_IN" && action.autoCreated)
    );
}

function ActionDetailLines({ lines }) {
    if (!lines.length) {
        return null;
    }

    return (
        <Stack spacing={0.5}>
            {lines.map((line, index) => (
                line.caption ? (
                    <Typography
                        key={`caption-${index}`}
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontStyle: "italic" }}
                    >
                        {line.value}
                    </Typography>
                ) : (
                    <Typography key={`${line.label}-${index}`} variant="body2">
                        {line.label && (
                            <Typography
                                component="span"
                                variant="body2"
                                color="text.secondary"
                            >
                                {line.label}:{" "}
                            </Typography>
                        )}
                        {line.value}
                    </Typography>
                )
            ))}
        </Stack>
    );
}

function TimelineCard({
    action,
    isLatest,
    isLast,
    canEditAction,
    canDeleteAction,
    onEdit,
    onDelete
}) {
    const color = action.trainingAppointment
        ? "info"
        : (actionColor[action.actionType] || "default");
    const detailLines = getActionDetailLines(action);
    const label = getActionTypeLabel(action);
    const showActions = Boolean((canEditAction && onEdit) || (canDeleteAction && onDelete));

    return (
        <Box sx={{ display: "flex", gap: 2 }}>
            <Box
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    pt: 0.4,
                    flexShrink: 0
                }}
            >
                <Box
                    sx={{
                        width: 34,
                        height: 34,
                        borderRadius: 2.25,
                        display: "grid",
                        placeItems: "center",
                        color: color === "default" ? "text.secondary" : `${color}.main`,
                        bgcolor: color === "default" ? "grey.100" : `${color}.light`,
                        border: "1px solid",
                        borderColor: color === "default" ? "divider" : `${color}.main`,
                        flexShrink: 0,
                        "& svg": { fontSize: 18 }
                    }}
                >
                    <EventIcon />
                </Box>
                {!isLast && (
                    <Box
                        sx={{
                            width: 2,
                            flexGrow: 1,
                            bgcolor: "divider",
                            mt: 0.5,
                            minHeight: 22
                        }}
                    />
                )}
            </Box>

            <Paper
                variant="outlined"
                sx={{
                    flexGrow: 1,
                    p: { xs: 1.75, sm: 2 },
                    mb: 1.5,
                    borderRadius: 2.5,
                    borderColor: isLatest ? "primary.main" : "divider",
                    bgcolor: isLatest ? "primary.50" : "background.paper",
                    boxShadow: isLatest ? 1 : 0
                }}
            >
                <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    sx={{
                        alignItems: { sm: "center" },
                        justifyContent: "space-between",
                        mb: detailLines.length || action.remarks ? 1.25 : 0
                    }}
                >
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
                        <Chip
                            label={label}
                            size="small"
                            color={color}
                            variant="outlined"
                        />
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {formatDisplayDate(action.actionDate)}
                        </Typography>
                        {isLatest && <Chip label="Latest" size="small" color="primary" />}
                    </Stack>

                    {showActions && (
                        <Stack direction="row" spacing={0.5}>
                            {canEditAction && onEdit && (
                                <Tooltip title="Edit this event">
                                    <IconButton
                                        size="small"
                                        onClick={() => onEdit(action)}
                                        aria-label={`Edit ${label}`}
                                        sx={{ bgcolor: "background.paper", border: "1px solid", borderColor: "divider" }}
                                    >
                                        <EditIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            )}
                            {canDeleteAction && onDelete && (
                                <Tooltip title="Delete latest action">
                                    <IconButton
                                        size="small"
                                        color="error"
                                        onClick={() => onDelete(action)}
                                        aria-label={`Delete ${label}`}
                                        sx={{ bgcolor: "background.paper", border: "1px solid", borderColor: "divider" }}
                                    >
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            )}
                        </Stack>
                    )}
                </Stack>

                <ActionDetailLines lines={detailLines} />

                {action.remarks && (
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: detailLines.length ? 1 : 0 }}
                    >
                        Remarks: {action.remarks}
                    </Typography>
                )}
            </Paper>
        </Box>
    );
}

function withRevision(employee, payload) {
    return {
        ...payload,
        expectedHistoryRevision: employee?.lifecycleHistoryRevision
    };
}

export default function EmployeeActionHistoryTable({
    actions,
    designations,
    employee,
    onRefresh,
    canEdit = true
}) {
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [selectedAction, setSelectedAction] = useState(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [actionToDelete, setActionToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const visibleActions = filterVisibleActions(actions);
    const latestActionId = visibleActions.find(
        (item) => item.canDelete ?? item.canModify
    )?.id ?? visibleActions[0]?.id;

    const editBounds = selectedAction
        ? getLifecycleEditDateBounds({
            action: selectedAction,
            actionHistory: actions,
            serviceRules: getEmployeeServiceRules(employee)
        })
        : null;
    const previousEventDate = editBounds?.previousEventDate
        ?? (selectedAction
            ? getPreviousEventDateForEdit(actions, selectedAction.id)
            : null);
    const nextEventDate = editBounds?.nextEventDate
        ?? (selectedAction
            ? getNextEventDateForEdit(actions, selectedAction.id)
            : null);
    const editMaxDate = editBounds?.maxDate ?? null;
    const editMaxReason = editBounds?.maxReason ?? null;

    const permanentConfirmationMinDate = (() => {
        if (selectedAction?.actionType !== "PERMANENT_CONFIRMATION") {
            return getPermanentConfirmationMinDate(employee?.dateOfFirstAppointment);
        }
        const chronological = [...(actions ?? [])]
            .filter((item) => item?.actionDate && !(item.actionType === "TRANSFER_IN" && item.autoCreated))
            .sort((left, right) => {
                const byDate = (left.actionDate || "").localeCompare(right.actionDate || "");
                return byDate !== 0 ? byDate : (left.id ?? 0) - (right.id ?? 0);
            });
        const index = chronological.findIndex((item) => item.id === selectedAction.id);
        for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
            const prior = chronological[cursor];
            if (prior.actionType === "NEW_APPOINTMENT"
                || prior.actionType === "SERVICE_APPOINTMENT"
                || prior.trainingGraduation) {
                return getPermanentConfirmationMinDate(prior.actionDate);
            }
        }
        return getPermanentConfirmationMinDate(employee?.dateOfFirstAppointment);
    })();

    const closeEdit = () => {
        setEditDialogOpen(false);
        setSelectedAction(null);
    };

    const handleEditClick = (action) => {
        setSelectedAction(action);
        setEditDialogOpen(true);
    };

    const handleDeleteClick = (action) => {
        setActionToDelete(action);
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        setDeleting(true);
        try {
            await deleteEmployeeAction(actionToDelete.id, employee?.lifecycleHistoryRevision);
            toast.success(
                actionToDelete.trainingGraduation
                    ? "Training appointment reverted successfully"
                    : "Lifecycle action deleted successfully"
            );
            onRefresh();
            setDeleteDialogOpen(false);
        } catch (error) {
            toast.error(getApiErrorMessage(error));
        } finally {
            setDeleting(false);
        }
    };

    const saveUpdate = async (payload, successMessage) => {
        await updateEmployeeAction(
            selectedAction.id,
            withRevision(employee, payload)
        );
        toast.success(successMessage || "Lifecycle action updated successfully");
        closeEdit();
        onRefresh();
    };

    if (!visibleActions.length) {
        return (
            <EmployeeProfileEmptyState
                icon={<HistoryIcon />}
                title="No lifecycle actions recorded"
                description={
                    canEdit
                        ? "Use Employee Actions in the profile header to record appointments, transfers, promotions, and other lifecycle events."
                        : "This employee does not have any recorded lifecycle events yet."
                }
            />
        );
    }

    const action = selectedAction;
    const exitMeta = action ? EXIT_ACTION_META[action.actionType] : null;
    const isTraineeAppointment = Boolean(action?.trainingAppointment);
    const isTrainingGraduation = Boolean(action?.trainingGraduation);
    const isStandaloneTransferIn = action?.actionType === "TRANSFER_IN"
        && !action.linkedActionId
        && !action.autoCreated;

    return (
        <>
            <Paper
                variant="outlined"
                sx={{
                    p: { xs: 2, sm: 2.5 },
                    mb: 2.5,
                    borderRadius: 3,
                    background: (theme) =>
                        `linear-gradient(135deg, ${theme.palette.background.paper}, ${theme.palette.primary[50]})`
                }}
            >
                <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1.5}
                    sx={{ alignItems: { xs: "flex-start", sm: "center" }, justifyContent: "space-between" }}
                >
                    <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
                        <Box
                            sx={{
                                width: 44,
                                height: 44,
                                borderRadius: 2.75,
                                display: "grid",
                                placeItems: "center",
                                bgcolor: "primary.main",
                                color: "primary.contrastText"
                            }}
                        >
                            <HistoryIcon />
                        </Box>
                        <Box>
                            <Typography variant="h6">Employment timeline</Typography>
                            <Typography variant="body2" color="text.secondary">
                                Most recent events appear first.
                            </Typography>
                        </Box>
                    </Stack>
                    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
                        <Chip label={`${visibleActions.length} ${visibleActions.length === 1 ? "event" : "events"}`} variant="outlined" />
                        {canEdit && (
                            <Chip
                                label="Any event can be edited. Only the latest can be deleted."
                                color="info"
                                variant="outlined"
                            />
                        )}
                    </Stack>
                </Stack>
            </Paper>

            <ServiceAppointmentHistory employee={employee} />
            <Box sx={{ maxWidth: 980 }}>
                {visibleActions.map((item, index) => {
                    const isLatest = item.canDelete
                        ?? item.canModify
                        ?? item.id === latestActionId;
                    const canEditAction = canEdit && (item.canEdit ?? item.canModify ?? true)
                        && !item.autoCreated;
                    const canDeleteAction = canEdit && Boolean(
                        item.canDelete ?? (item.canModify && isLatest)
                    );
                    return (
                    <TimelineCard
                        key={item.id}
                        action={item}
                        isLatest={isLatest}
                        isLast={index === visibleActions.length - 1}
                        canEditAction={canEditAction}
                        canDeleteAction={canDeleteAction}
                        onEdit={canEdit ? handleEditClick : null}
                        onDelete={canEdit ? handleDeleteClick : null}
                    />
                    );
                })}
            </Box>

            {canEdit && action && editDialogOpen && (
                <>
                    {action.actionType === "SERVICE_APPOINTMENT" && (
                        <ServiceAppointmentDialog
                            open={editDialogOpen}
                            onClose={closeEdit}
                            initialAction={action}
                            employee={{
                                ...employee,
                                designation: designations?.find(
                                    (d) => d.id === action.oldDesignationId
                                ) || employee?.designation,
                                service: employee.serviceAppointments?.find(
                                    (p) => p.endDate === action.actionDate
                                )
                                    ? {
                                        id: employee.serviceAppointments.find(
                                            (p) => p.endDate === action.actionDate
                                        ).serviceId
                                    }
                                    : employee?.service
                            }}
                            previousEventDate={previousEventDate}
                            nextEventDate={nextEventDate}
                            maxDate={editMaxDate}
                            maxDateHelperText={editMaxReason}
                            onSubmit={async (data) => {
                                await saveUpdate({
                                    actionDate: data.appointmentDate,
                                    newDesignationId: data.newDesignationId,
                                    serviceLevelId: data.serviceLevelId,
                                    serviceId: data.serviceId,
                                    grade: data.grade,
                                    appointmentBasis: data.appointmentBasis,
                                    incrementDate: data.incrementDate,
                                    firstIncrementDueDate: data.firstIncrementDueDate,
                                    department: data.department,
                                    office: data.office,
                                    district: data.district,
                                    remarks: data.remarks
                                }, "Service appointment revised");
                            }}
                        />
                    )}

                    {action.actionType === "OFFICE_CHANGE" && (
                        <OfficeChangeDialog
                            open={editDialogOpen}
                            onClose={closeEdit}
                            initialAction={action}
                            employeeName={employee?.fullName}
                            currentDepartment={action.fromDepartment || action.department}
                            currentOffice={action.fromOffice}
                            currentDistrictOfWorking={null}
                            previousEventDate={previousEventDate}
                            maxDate={editMaxDate}
                            maxDateHelperText={editMaxReason}
                            hasCatalogDesignation={Boolean(
                                action.newDesignationId || employee?.designation?.id
                            )}
                            onSubmit={async (data) => {
                                await saveUpdate({
                                    actionDate: data.effectiveDate,
                                    department: action.department || action.fromDepartment,
                                    office: data.office,
                                    district: data.district,
                                    specialDesignationName: data.specialDesignationName ?? "",
                                    remarks: data.remarks
                                }, "Office change updated");
                            }}
                        />
                    )}

                    {(action.actionType === "PROMOTION"
                        || action.actionType === "ASSIGNMENT_GRADE_UPDATE") && (
                        <PromotionDialog
                            open={editDialogOpen}
                            onClose={closeEdit}
                            initialAction={action}
                            employee={employee}
                            previousEventDate={previousEventDate}
                            maxDate={editMaxDate}
                            maxDateHelperText={editMaxReason}
                            onSubmit={async (data) => {
                                await saveUpdate({
                                    actionDate: data.promotionDate,
                                    newDesignationId: data.newDesignationId ?? null,
                                    recordedDesignationName: data.recordedDesignationName ?? null,
                                    specialDesignationName: data.specialDesignationName ?? null,
                                    grade: data.grade,
                                    serviceLevelId: data.serviceLevelId,
                                    transferringOut: data.transferringOut,
                                    toDepartment: data.toDepartment,
                                    toOffice: data.toOffice,
                                    toDistrict: data.toDistrict,
                                    remarks: data.remarks
                                }, "Promotion updated");
                            }}
                        />
                    )}

                    {action.actionType === "TRANSFER_OUT" && (
                        <TransferOutDialog
                            open={editDialogOpen}
                            onClose={closeEdit}
                            initialAction={action}
                            employee={employee}
                            employeeName={employee?.fullName}
                            currentDepartment={action.fromDepartment}
                            currentOffice={action.fromOffice}
                            currentDistrictOfWorking={null}
                            previousEventDate={previousEventDate}
                            maxDate={editMaxDate}
                            maxDateHelperText={editMaxReason}
                            onSubmit={async (data) => {
                                await saveUpdate({
                                    actionDate: data.transferDate,
                                    newDesignationId: data.newDesignationId ?? null,
                                    recordedDesignationName: data.recordedDesignationName ?? null,
                                    specialDesignationName: data.specialDesignationName ?? null,
                                    serviceLevelId: data.serviceLevelId,
                                    toDepartment: data.toDepartment,
                                    toOffice: data.toOffice,
                                    toDistrict: data.toDistrict,
                                    district: data.toDistrict,
                                    remarks: data.remarks
                                }, "Transfer out updated");
                            }}
                        />
                    )}

                    {isStandaloneTransferIn && (
                        <TransferInDialog
                            open={editDialogOpen}
                            onClose={closeEdit}
                            initialAction={action}
                            employeeName={employee?.fullName}
                            previousEventDate={previousEventDate}
                            maxDate={editMaxDate}
                            maxDateHelperText={editMaxReason}
                            onSubmit={async (data) => {
                                await saveUpdate({
                                    actionDate: data.effectiveDate,
                                    transferredFrom: data.transferredFrom,
                                    remarks: data.remarks
                                }, "Transfer in updated");
                            }}
                        />
                    )}

                    {action.actionType === "NEW_APPOINTMENT"
                        && isTrainingGraduation && (
                        <TrainingAppointmentDialog
                            open={editDialogOpen}
                            onClose={closeEdit}
                            initialAction={action}
                            employee={employee}
                            previousEventDate={previousEventDate}
                            maxDate={editMaxDate}
                            maxDateHelperText={editMaxReason}
                            canAppoint
                            onSubmit={async (data) => {
                                await saveUpdate({
                                    actionDate: data.appointmentDate,
                                    serviceLevelId: data.serviceLevelId,
                                    department: data.department,
                                    office: data.office,
                                    district: data.district,
                                    remarks: data.remarks
                                }, "Training appointment updated");
                            }}
                        />
                    )}

                    {action.actionType === "NEW_APPOINTMENT"
                        && !isTrainingGraduation
                        && !isTraineeAppointment && (
                        <NewAppointmentDialog
                            open={editDialogOpen}
                            onClose={closeEdit}
                            initialAction={action}
                            employeeName={employee?.fullName}
                            previousEventDate={previousEventDate}
                            maxDate={editMaxDate}
                            maxDateHelperText={editMaxReason}
                            onSubmit={async (data) => {
                                await saveUpdate({
                                    actionDate: data.appointmentDate,
                                    department: data.department,
                                    office: data.office,
                                    district: data.district,
                                    remarks: data.remarks
                                }, "New appointment updated");
                            }}
                        />
                    )}

                    {action.actionType === "NEW_APPOINTMENT"
                        && isTraineeAppointment && (
                        <SimpleLifecycleDialog
                            open={editDialogOpen}
                            onClose={closeEdit}
                            initialAction={action}
                            title="Edit New Trainee Appointment"
                            description="Only the appointment date and remarks can be revised for the original trainee appointment."
                            confirmLabel="Save changes"
                            previousEventDate={previousEventDate}
                            maxDate={editMaxDate}
                            maxDateHelperText={editMaxReason}
                            onSubmit={async (data) => {
                                await saveUpdate({
                                    actionDate: data.actionDate,
                                    remarks: data.remarks
                                }, "Trainee appointment updated");
                            }}
                        />
                    )}

                    {action.actionType === "PERMANENT_CONFIRMATION" && (
                        <MakePermanentDialog
                            open={editDialogOpen}
                            onClose={closeEdit}
                            initialAction={action}
                            employeeName={employee?.fullName}
                            minDate={permanentConfirmationMinDate}
                            previousEventDate={previousEventDate}
                            maxDate={editMaxDate}
                            maxDateHelperText={editMaxReason}
                            onSubmit={async (data) => {
                                await saveUpdate({
                                    actionDate: data.confirmationDate,
                                    remarks: data.remarks
                                }, "Permanent confirmation updated");
                            }}
                        />
                    )}

                    {exitMeta && (
                        <SimpleLifecycleDialog
                            open={editDialogOpen}
                            onClose={closeEdit}
                            initialAction={action}
                            title={exitMeta.title}
                            description={exitMeta.description}
                            severity={exitMeta.severity}
                            confirmLabel="Save changes"
                            confirmColor={
                                exitMeta.severity === "error" ? "error" : "primary"
                            }
                            requireReason={exitMeta.requireReason}
                            previousEventDate={previousEventDate}
                            maxDate={editMaxDate}
                            maxDateHelperText={editMaxReason}
                            onSubmit={async (data) => {
                                await saveUpdate({
                                    actionDate: data.actionDate,
                                    reason: data.reason,
                                    remarks: data.remarks
                                }, `${ACTION_TYPE_LABELS[action.actionType] || "Action"} updated`);
                            }}
                        />
                    )}
                </>
            )}

            {canEdit && (
                <Dialog
                    open={deleteDialogOpen}
                    onClose={() => setDeleteDialogOpen(false)}
                >
                    <DialogTitle>
                        Delete {getActionTypeLabel(actionToDelete) || "Action"}
                    </DialogTitle>
                    <DialogContent>
                        <Typography>
                            {actionToDelete?.trainingGraduation
                                ? "This will undo the training-to-permanent appointment and restore the employee as a training employee. Continue?"
                                : "This will recalculate employee history. Continue?"}
                        </Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button
                            onClick={() => setDeleteDialogOpen(false)}
                            disabled={deleting}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleDeleteConfirm}
                            color="error"
                            variant="contained"
                            disabled={deleting}
                        >
                            {deleting ? "Deleting..." : "Delete"}
                        </Button>
                    </DialogActions>
                </Dialog>
            )}
        </>
    );
}
