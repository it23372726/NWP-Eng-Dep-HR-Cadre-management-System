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
    Add as AddIcon,
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
import MobileDataCard, {
    DesktopTableWrapper,
    MobileDataCardList
} from "../components/MobileDataCard";
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
        return date.toLocaleDateString("en-GB", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    const openCreateDialog = () => {
        setSelectedLevel(null);
        setOpen(true);
    };

    const openEditDialog = (level) => {
        setSelectedLevel(level);
        setOpen(true);
    };

    const closeFormDialog = () => {
        setOpen(false);
        setSelectedLevel(null);
    };

    return (
        <Container maxWidth="lg">
            <Box sx={{ mb: 3 }}>
                <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={2}
                    sx={{ mb: 2, justifyContent: "space-between", alignItems: { sm: "center" } }}
                >
                    <Box>
                        <Typography variant="h4" gutterBottom>
                            Service Levels
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            Manage service level classifications for employees. Add, edit, or
                            remove levels as needed for your organization.
                        </Typography>
                    </Box>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={openCreateDialog}
                        sx={{ alignSelf: { xs: "flex-start", sm: "center" }, flexShrink: 0 }}
                    >
                        Add Service Level
                    </Button>
                </Stack>

                <Typography variant="body2" color="text.secondary">
                    Showing {levels.length} service level{levels.length !== 1 ? "s" : ""}
                </Typography>
            </Box>

            {levels.length === 0 ? (
                <Paper variant="outlined" sx={{ p: 4, textAlign: "center" }}>
                    <Typography color="text.secondary" gutterBottom>
                        No service levels configured yet
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Create your first service level to get started
                    </Typography>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={openCreateDialog}
                    >
                        Add Service Level
                    </Button>
                </Paper>
            ) : (
                <>
                <DesktopTableWrapper>
                <TableContainer component={Paper} variant="outlined">
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Service Level Name</TableCell>
                                <TableCell>Created</TableCell>
                                <TableCell>Last Updated</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {levels.map((level) => (
                                <TableRow
                                    key={level.id}
                                    hover
                                    sx={{ "&:last-child td": { borderBottom: 0 } }}
                                >
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
                                        <Tooltip title="Edit service level">
                                            <IconButton
                                                size="small"
                                                onClick={() => openEditDialog(level)}
                                            >
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Delete service level">
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
                </DesktopTableWrapper>

                <MobileDataCardList>
                    {levels.map((level) => (
                        <MobileDataCard
                            key={level.id}
                            title={level.levelName}
                            fields={[
                                { label: "Created", value: formatDate(level.createdAt) },
                                { label: "Last Updated", value: formatDate(level.updatedAt) }
                            ]}
                            actions={
                                <>
                                    <Tooltip title="Edit service level">
                                        <IconButton
                                            size="small"
                                            onClick={() => openEditDialog(level)}
                                        >
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Delete service level">
                                        <IconButton
                                            size="small"
                                            color="error"
                                            onClick={() => handleDeleteClick(level)}
                                        >
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                </>
                            }
                        />
                    ))}
                </MobileDataCardList>
                </>
            )}

            <ServiceLevelForm
                open={open}
                handleClose={closeFormDialog}
                handleSubmit={selectedLevel ? handleUpdate : handleCreate}
                selectedLevel={selectedLevel}
            />

            <Dialog
                open={deleteDialogOpen}
                onClose={() => !deleting && setDeleteDialogOpen(false)}
            >
                <DialogTitle>Delete Service Level</DialogTitle>
                <DialogContent>
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        Deleting this service level may affect designations and employee
                        records linked to it.
                    </Alert>
                    <Typography>
                        Are you sure you want to delete the service level "
                        {levelToDelete?.levelName}"?
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
