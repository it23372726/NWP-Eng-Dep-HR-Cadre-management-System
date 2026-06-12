import {
    Alert,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Typography,
    Chip,
    IconButton,
    Tooltip
} from "@mui/material";
import {
    Edit as EditIcon,
    Delete as DeleteIcon
} from "@mui/icons-material";

import {
    ACTION_TYPE_LABELS,
    formatActionDetails,
    getApiErrorMessage
} from "../constants/hrms";

import LifecycleActionFormDialog from "./LifecycleActionFormDialog";
import { useState } from "react";
import { deleteEmployeeAction } from "../services/employeeLifecycleService";
import toast from "react-hot-toast";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button
} from "@mui/material";

const actionColor = {
    NEW_APPOINTMENT: "primary",
    TRANSFER_IN: "info",
    TRANSFER_OUT: "warning",
    PROMOTION: "success",
    ASSIGNMENT_GRADE_UPDATE: "info",
    PERMANENT_CONFIRMATION: "success",
    RETIREMENT_OR_RESIGNATION: "default",
    DEATH: "default",
    DISMISSAL: "error"
};

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

    if (!actions?.length) {
        return (
            <Typography color="text.secondary" sx={{ py: 2 }}>
                No lifecycle actions recorded yet.
            </Typography>
        );
    }

    const latestActionId = actions.find((action) => action.canModify)?.id
        ?? actions[0]?.id;

    return (
        <>
            <Alert severity="info" sx={{ mb: 2 }}>
                Actions are listed with the most recent at the top. Only the latest
                action can be edited or deleted to keep employee history consistent.
            </Alert>

            <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Action</TableCell>
                            <TableCell>Date</TableCell>
                            <TableCell>Details</TableCell>
                            <TableCell>Remarks</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {actions.map((action) => (
                            <TableRow key={action.id}>
                                <TableCell>
                                    <Chip
                                        label={
                                            ACTION_TYPE_LABELS[action.actionType]
                                            || action.actionType
                                        }
                                        size="small"
                                        color={
                                            actionColor[action.actionType]
                                            || "default"
                                        }
                                        variant="outlined"
                                    />
                                </TableCell>
                                <TableCell>{action.actionDate}</TableCell>
                                <TableCell>
                                    {formatActionDetails(action)}
                                </TableCell>
                                <TableCell>
                                    {action.remarks || "—"}
                                </TableCell>
                                <TableCell align="right">
                                    {action.canModify ?? action.id === latestActionId ? (
                                        <>
                                            <Tooltip title="Edit latest action">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleEditClick(action)}
                                                >
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Delete latest action">
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={() => handleDeleteClick(action)}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </>
                                    ) : (
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                        >
                                            —
                                        </Typography>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <LifecycleActionFormDialog
                open={editDialogOpen}
                onClose={() => setEditDialogOpen(false)}
                action={selectedAction}
                employee={employee}
                designations={designations || []}
                onSuccess={handleEditSuccess}
            />

            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle>Confirm Delete</DialogTitle>
                <DialogContent>
                    <Typography>
                        Deleting this lifecycle action will recalculate employee history and cadre reports. Continue?
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
