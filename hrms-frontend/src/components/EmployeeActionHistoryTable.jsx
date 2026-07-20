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
    getActionDetailLines,
    getActionTypeLabel,
    getApiErrorMessage
} from "../constants/hrms";
import { deleteEmployeeAction } from "../services/employeeLifecycleService";
import LifecycleActionFormDialog from "./LifecycleActionFormDialog";
import { EmployeeProfileEmptyState } from "./EmployeeProfileSection";

const actionColor = {
    NEW_APPOINTMENT: "primary",
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
    onEdit,
    onDelete
}) {
    const color = action.trainingAppointment
        ? "info"
        : (actionColor[action.actionType] || "default");
    const detailLines = getActionDetailLines(action);
    const label = getActionTypeLabel(action);

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

                    {isLatest && onEdit && onDelete && (
                        <Stack direction="row" spacing={0.5}>
                            <Tooltip title="Edit latest action">
                                <IconButton
                                    size="small"
                                    onClick={() => onEdit(action)}
                                    aria-label={`Edit ${label}`}
                                    sx={{ bgcolor: "background.paper", border: "1px solid", borderColor: "divider" }}
                                >
                                    <EditIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
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
    const latestActionId = visibleActions.find((action) => action.canModify)?.id
        ?? visibleActions[0]?.id;

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
            await deleteEmployeeAction(actionToDelete.id);
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

    const handleEditSuccess = () => {
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
                        {canEdit && <Chip label="Latest event is editable" color="info" variant="outlined" />}
                    </Stack>
                </Stack>
            </Paper>

            <Box sx={{ maxWidth: 980 }}>
                {visibleActions.map((action, index) => (
                    <TimelineCard
                        key={action.id}
                        action={action}
                        isLatest={
                            action.canModify ?? action.id === latestActionId
                        }
                        isLast={index === visibleActions.length - 1}
                        onEdit={canEdit ? handleEditClick : null}
                        onDelete={canEdit ? handleDeleteClick : null}
                    />
                ))}
            </Box>

            {canEdit && (
                <>
            <LifecycleActionFormDialog
                open={editDialogOpen}
                onClose={() => setEditDialogOpen(false)}
                action={selectedAction}
                employee={employee}
                designations={designations || []}
                actionHistory={actions}
                onSuccess={handleEditSuccess}
            />

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
                </>
            )}
        </>
    );
}
