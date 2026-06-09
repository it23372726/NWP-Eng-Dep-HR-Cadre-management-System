import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Typography,
    Container,
    Button,
    Stack,
    Box,
    IconButton,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert
} from "@mui/material";
import {
    Edit as EditIcon,
    Delete as DeleteIcon
} from "@mui/icons-material";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import {
    getServiceLevels,
    createServiceLevel,
    updateServiceLevel,
    deleteServiceLevel
} from "../services/serviceLevelService";

import ServiceLevelForm from "../components/ServiceLevelForm";
import { getApiErrorMessage } from "../constants/hrms";

export default function ServiceLevelPage() {
    const [levels, setLevels] = useState([]);
    const [open, setOpen] = useState(false);
    const [selectedLevel, setSelectedLevel] = useState(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [levelToDelete, setLevelToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        loadLevels();
    }, []);

    const loadLevels = async () => {
        try {
            const data = await getServiceLevels();
            setLevels(data);
        } catch (error) {
            toast.error(getApiErrorMessage(error));
        }
    };

    const handleCreate = async (data) => {
        try {
            await createServiceLevel(data);
            toast.success("Service level created");
            setOpen(false);
            loadLevels();
        } catch (error) {
            toast.error(getApiErrorMessage(error));
        }
    };

    const handleUpdate = async (data) => {
        try {
            await updateServiceLevel(selectedLevel.id, data);
            toast.success("Service level updated");
            setOpen(false);
            setSelectedLevel(null);
            loadLevels();
        } catch (error) {
            toast.error(getApiErrorMessage(error));
        }
    };

    const handleDeleteClick = (level) => {
        setLevelToDelete(level);
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        setDeleting(true);
        try {
            await deleteServiceLevel(levelToDelete.id);
            toast.success("Service level deleted");
            setDeleteDialogOpen(false);
            setLevelToDelete(null);
            loadLevels();
        } catch (error) {
            toast.error(getApiErrorMessage(error));
        } finally {
            setDeleting(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return "—";
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    return (
        <Container maxWidth="lg">
            <Box sx={{ mb: 4 }}>
                <Stack
                    direction="row"
                    sx={{ mb: 2, justifyContent: 'space-between', alignItems: 'center' }}
                >
                    <Typography variant="h4">
                        Service Levels
                    </Typography>
                    <Button
                        variant="contained"
                        onClick={() => {
                            setSelectedLevel(null);
                            setOpen(true);
                        }}
                    >
                        Add Service Level
                    </Button>
                </Stack>

                <Typography variant="body1" color="text.secondary">
                    Manage service level classifications for employees. Add, edit, or delete
                    service levels as needed for your organization.
                </Typography>
            </Box>

            <TableContainer component={Paper} variant="outlined">
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Service Level Name</TableCell>
                            <TableCell>Created Date</TableCell>
                            <TableCell>Last Updated</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>

                    <TableBody>
                        {levels.map((level) => (
                            <TableRow key={level.id}>
                                <TableCell>
                                    <Typography variant="body2" fontWeight={500}>
                                        {level.levelName}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Typography variant="body2" color="text.secondary">
                                        {formatDate(level.createdAt)}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Typography variant="body2" color="text.secondary">
                                        {formatDate(level.updatedAt)}
                                    </Typography>
                                </TableCell>
                                <TableCell align="right">
                                    <Tooltip title="Edit">
                                        <IconButton
                                            size="small"
                                            onClick={() => {
                                                setSelectedLevel(level);
                                                setOpen(true);
                                            }}
                                        >
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Delete">
                                        <IconButton
                                            size="small"
                                            color="error"
                                            onClick={() => handleDeleteClick(level)}
                                        >
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <ServiceLevelForm
                open={open}
                handleClose={() => {
                    setOpen(false);
                    setSelectedLevel(null);
                }}
                handleSubmit={
                    selectedLevel ? handleUpdate : handleCreate
                }
                selectedLevel={selectedLevel}
            />

            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle>Confirm Delete</DialogTitle>
                <DialogContent>
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        Deleting this service level may affect employee records.
                    </Alert>
                    <Typography>
                        Are you sure you want to delete the service level "{levelToDelete?.levelName}"?
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
        </Container>
    );
}
