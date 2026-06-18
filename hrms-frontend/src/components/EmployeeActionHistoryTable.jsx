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
    Edit as EditIcon,
    Delete as DeleteIcon
} from "@mui/icons-material";
import { useState } from "react";
import toast from "react-hot-toast";

import {
    ACTION_TYPE_LABELS,
    getActionDetailLines,
    getApiErrorMessage
} from "../constants/hrms";
import { deleteEmployeeAction } from "../services/employeeLifecycleService";
import LifecycleActionFormDialog from "./LifecycleActionFormDialog";

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
    DISMISSAL: "error"
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
    onEdit,
    onDelete
}) {
    const color = actionColor[action.actionType] || "default";
    const detailLines = getActionDetailLines(action);
    const label = ACTION_TYPE_LABELS[action.actionType] || action.actionType;

    return (
        <Box sx={{ display: "flex", gap: 2 }}>
            <Box
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    pt: 0.75,
                    flexShrink: 0
                }}
            >
                <Box
                    sx={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        bgcolor: color === "default" ? "grey.500" : `${color}.main`,
                        flexShrink: 0
                    }}
                />
                <Box
                    sx={{
                        width: 2,
                        flexGrow: 1,
                        bgcolor: "divider",
                        mt: 0.5,
                        minHeight: 16
                    }}
                />
            </Box>

            <Paper
                variant="outlined"
                sx={{
                    flexGrow: 1,
                    p: 2,
                    mb: 1.5,
                    borderRadius: 2,
                    borderColor: isLatest ? "primary.main" : "divider",
                    bgcolor: isLatest ? "primary.50" : "background.paper"
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
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <Chip
                            label={label}
                            size="small"
                            color={color}
                            variant="outlined"
                        />
                        <Typography variant="body2" fontWeight={600}>
                            {formatDisplayDate(action.actionDate)}
                        </Typography>
                    </Stack>

                    {isLatest && (
                        <Stack direction="row" spacing={0.5}>
                            <Tooltip title="Edit latest action">
                                <IconButton size="small" onClick={() => onEdit(action)}>
                                    <EditIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete latest action">
                                <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => onDelete(action)}
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
    onRefresh
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
            toast.success("Lifecycle action deleted successfully");
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
            <Paper
                variant="outlined"
                sx={{
                    py: 5,
                    px: 3,
                    textAlign: "center",
                    borderRadius: 2
                }}
            >
                <Typography variant="body1" color="text.secondary">
                    No lifecycle actions recorded yet.
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Use Employee Actions in the profile header to record appointments,
                    transfers, promotions, and other lifecycle events.
                </Typography>
            </Paper>
        );
    }

    return (
        <>
            <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mb: 2 }}
            >
                Most recent first · only the latest action can be edited or deleted
            </Typography>

            <Box>
                {visibleActions.map((action) => (
                    <TimelineCard
                        key={action.id}
                        action={action}
                        isLatest={
                            action.canModify ?? action.id === latestActionId
                        }
                        onEdit={handleEditClick}
                        onDelete={handleDeleteClick}
                    />
                ))}
            </Box>

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
                    Delete {ACTION_TYPE_LABELS[actionToDelete?.actionType] || "Action"}
                </DialogTitle>
                <DialogContent>
                    <Typography>
                        This will recalculate employee history. Continue?
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
    );
}
